const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('inventory.itemId');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, [
  body('displayName').optional().isLength({ min: 3, max: 30 }).trim().escape(),
  body('fullName').optional().trim(),
  body('dateOfBirth').optional().isISO8601(),
  body('phoneNumber').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { displayName, fullName, dateOfBirth, phoneNumber, bankAccount } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (displayName) user.displayName = displayName;
    if (fullName) user.fullName = fullName;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (bankAccount) user.bankAccount = bankAccount;

    await user.save();

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        coins: user.coins
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/user/avatar
// @desc    Change avatar
// @access  Private
router.put('/avatar', authenticate, [
  body('avatar').isString().notEmpty()
], async (req, res) => {
  try {
    const { avatar } = req.body;

    const user = await User.findById(req.user.id);
    user.avatar = avatar;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Avatar updated successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/user/daily-bonus
// @desc    Claim daily bonus
// @access  Private
router.post('/daily-bonus', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.canClaimDailyBonus()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quà hàng ngày đã được nhận hôm nay' 
      });
    }

    const bonusAmount = parseInt(process.env.DAILY_BONUS_COINS) || 1000;
    const balanceBefore = user.coins;
    
    user.coins += bonusAmount;
    user.totalCoinsEarned += bonusAmount;
    user.lastDailyBonus = new Date();
    await user.save();

    // Create transaction
    await Transaction.create({
      userId: user._id,
      type: 'daily-bonus',
      amount: bonusAmount,
      balanceBefore,
      balanceAfter: user.coins,
      status: 'completed',
      description: 'Daily bonus claimed'
    });

    res.json({ 
      success: true, 
      message: `Quà hàng ngày đã được nhận!`,
      coins: user.coins,
      bonusAmount
    });
  } catch (error) {
    console.error('Daily bonus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/user/auto-refill
// @desc    Auto refill coins
// @access  Private
router.post('/auto-refill', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.coins > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bạn vẫn còn coin' 
      });
    }

    if (!user.canAutoRefill()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Số lượng coin đã đạt đến giới hạn. Vui lòng liên hệ admin hoặc đợi đến ngày mai.' 
      });
    }

    const refillAmount = parseInt(process.env.AUTO_REFILL_COINS) || 5000;
    const balanceBefore = user.coins;
    
    user.coins += refillAmount;
    user.refillCount += 1;
    user.lastRefillDate = new Date();
    await user.save();

    // Create transaction
    await Transaction.create({
      userId: user._id,
      type: 'refill',
      amount: refillAmount,
      balanceBefore,
      balanceAfter: user.coins,
      status: 'completed',
      description: `Auto refill ${user.refillCount}/${process.env.MAX_REFILL_COUNT || 3}`
    });

    res.json({ 
      success: true, 
      message: `Refilled ${refillAmount} coins!`,
      coins: user.coins,
      refillAmount,
      refillsRemaining: (parseInt(process.env.MAX_REFILL_COUNT) || 3) - user.refillCount
    });
  } catch (error) {
    console.error('Auto refill error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/user/stats
// @desc    Get user game statistics
// @access  Private
router.get('/stats', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('stats');
    
    res.json({ success: true, stats: user.stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/user/transactions
// @desc    Get user transaction history
// @access  Private
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    const query = { userId: req.user.id };
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
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

module.exports = router;
