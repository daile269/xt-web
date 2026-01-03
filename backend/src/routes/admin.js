const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Room = require('../models/Room');
const Transaction = require('../models/Transaction');
const GameHistory = require('../models/GameHistory');
const Item = require('../models/Item');
const { authenticate, isAdmin } = require('../middleware/auth');

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin
router.get('/users', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { username: new RegExp(search, 'i') },
        { displayName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/users/:id/coins
// @desc    Add/subtract coins for user
// @access  Admin
router.post('/users/:id/coins', authenticate, isAdmin, async (req, res) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || amount === 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const balanceBefore = user.coins;
    user.coins += amount;

    if (user.coins < 0) {
      return res.status(400).json({ success: false, message: 'Insufficient coins' });
    }

    await user.save();

    // Create transaction
    await Transaction.create({
      userId: user._id,
      type: 'admin-adjustment',
      amount: Math.abs(amount),
      balanceBefore,
      balanceAfter: user.coins,
      status: 'completed',
      description: reason || 'Admin adjustment',
      metadata: {
        adminId: req.user.id
      },
      processedBy: req.user.id,
      processedAt: new Date()
    });

    res.json({ 
      success: true, 
      message: `Coins ${amount > 0 ? 'added' : 'deducted'} successfully`,
      user: {
        id: user._id,
        username: user.username,
        coins: user.coins
      }
    });
  } catch (error) {
    console.error('Adjust coins error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/users/:id/ban
// @desc    Ban/unban user
// @access  Admin
router.post('/users/:id/ban', authenticate, isAdmin, async (req, res) => {
  try {
    const { isBanned, reason } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isBanned = isBanned;
    user.banReason = reason || '';
    await user.save();

    res.json({ 
      success: true, 
      message: isBanned ? 'User banned successfully' : 'User unbanned successfully',
      user: {
        id: user._id,
        username: user.username,
        isBanned: user.isBanned
      }
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/rooms
// @desc    Get all rooms
// @access  Admin
router.get('/rooms', authenticate, isAdmin, async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate('players.userId', 'username displayName')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ success: true, rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/admin/rooms/:id
// @desc    Reset/delete room
// @access  Admin
router.delete('/rooms/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Update all players in the room
    await User.updateMany(
      { currentRoom: room._id },
      { currentRoom: null }
    );

    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/transactions
// @desc    Get all transactions
// @access  Admin
router.get('/transactions', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;

    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .populate('userId', 'username displayName phoneNumber bankAccount')
      .populate('processedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Transaction.countDocuments(query);

    res.json({
      success: true,
      transactions,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/transactions/:id
// @desc    Process transaction (approve/reject)
// @access  Admin
router.put('/transactions/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    transaction.status = status;
    transaction.notes = notes;
    transaction.processedBy = req.user.id;
    transaction.processedAt = new Date();
    await transaction.save();

    // If approved and it's a deposit, add coins to user
    if (status === 'completed' && transaction.type === 'deposit') {
      const user = await User.findById(transaction.userId);
      if (user) {
        user.coins += transaction.amount;
        await user.save();
      }
    }

    res.json({ 
      success: true, 
      message: 'Transaction processed successfully',
      transaction
    });
  } catch (error) {
    console.error('Process transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Admin
router.get('/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const onlineUsers = await User.countDocuments({ isOnline: true });
    const activeRooms = await Room.countDocuments({ status: 'playing' });
    const totalRooms = await Room.countDocuments();
    
    const totalCoinsInCirculation = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$coins' } } }
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTransactions = await Transaction.countDocuments({
      createdAt: { $gte: todayStart },
      type: { $in: ['deposit', 'withdrawal'] }
    });

    const pendingTransactions = await Transaction.countDocuments({
      status: 'pending'
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        onlineUsers,
        activeRooms,
        totalRooms,
        totalCoinsInCirculation: totalCoinsInCirculation[0]?.total || 0,
        todayTransactions,
        pendingTransactions
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
