const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/room/list
// @desc    Get list of all rooms
// @access  Public
router.get('/list', async (req, res) => {
  try {
    const { gameType, zone } = req.query;

    const query = { isPrivate: false };
    if (gameType && gameType !== 'all') query.gameType = gameType;
    if (zone && zone !== 'all') query.zone = zone;

    const rooms = await Room.find(query)
      .populate('players.userId', 'username displayName avatar coins')
      .populate('createdBy', 'username displayName')
      .sort({ createdAt: -1 });

    res.json({ success: true, rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/room/:id
// @desc    Get room details
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('players.userId', 'username displayName avatar coins')
      .populate('createdBy', 'username displayName');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.json({ success: true, room });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/room/create
// @desc    Create new room
// @access  Private
router.post('/create', authenticate, async (req, res) => {
  try {
    const { name, gameType, minBet, maxBet, zone, isPrivate, password } = req.body;

    // Determine zone requirements
    const zoneRequirements = {
      bronze: { minCoins: 0, maxCoins: 5000 },
      silver: { minCoins: 5000, maxCoins: 25000 },
      gold: { minCoins: 25000, maxCoins: 100000 },
      platinum: { minCoins: 100000, maxCoins: Infinity }
    };

    const user = await User.findById(req.user.id);

    // Check if user has enough coins
    if (user.coins < minBet * 10) {
      return res.status(400).json({ 
        success: false, 
        message: `Bạn cần ít nhất ${minBet * 10} coins để tạo phòng này` 
      });
    }

    const room = await Room.create({
      name: name || `${gameType.toUpperCase()} - ${zone.toUpperCase()}`,
      gameType,
      minBet,
      maxBet,
      zone: zone || 'bronze',
      zoneRequirement: zoneRequirements[zone || 'bronze'],
      isPrivate: isPrivate || false,
      password,
      createdBy: req.user.id,
      // No autoDeleteAt - room has 1 player (creator), so it persists
      players: [{
        userId: user._id,
        seat: 0,
        coins: user.coins,
        action: 'waiting'
      }]
    });

    // Update user's current room
    user.currentRoom = room._id;
    await user.save();

    // Populate the room data
    await room.populate('players.userId', 'username displayName avatar coins');
    await room.populate('createdBy', 'username displayName');

    res.status(201).json({ 
      success: true, 
      message: 'Tạo phòng thành công! Bạn đã tự động vào phòng.',
      room 
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/room/:id/join
// @desc    Join a room
// @access  Private
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Check if room is full
    if (room.isFull()) {
      return res.status(400).json({ success: false, message: 'Room is full' });
    }

    // Check if already in room
    const alreadyInRoom = room.players.some(p => p.userId.toString() === req.user.id);
    if (alreadyInRoom) {
      return res.status(400).json({ success: false, message: 'Already in this room' });
    }

    // Check private room password
    if (room.isPrivate && room.password !== password) {
      return res.status(403).json({ success: false, message: 'Incorrect password' });
    }

    const user = await User.findById(req.user.id);

    // Check zone requirements (only minimum - players with more coins can join lower zones)
    if (user.coins < room.zoneRequirement.minCoins) {
      return res.status(403).json({ 
        success: false, 
        message: `Bạn cần ít nhất ${room.zoneRequirement.minCoins} coins để vào khu vực ${room.zone.toUpperCase()}` 
      });
    }

    // Check minimum coins
    if (user.coins < room.minBet * 10) {
      return res.status(400).json({ 
        success: false, 
        message: `Bạn cần ít nhất ${room.minBet * 10} coins để vào phòng này` 
      });
    }

    // Get available seat
    const availableSeats = room.getAvailableSeats();
    const seat = availableSeats[0];

    // Add player to room
    room.players.push({
      userId: user._id,
      seat,
      coins: user.coins,
      action: 'waiting'
    });

    // Update user's current room
    user.currentRoom = room._id;
    await user.save();

    await room.save();

    res.json({ 
      success: true, 
      message: 'Joined room successfully',
      room,
      seat
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/room/:id/leave
// @desc    Leave a room
// @access  Private
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const roomId = req.params.id;

    // Atomic update: Remove player from room
    // Use findByIdAndUpdate to avoid VersionError during active games
    // This allows leaving even during 'playing' status (auto-fold logic handled by game engine or timeout)
    const room = await Room.findByIdAndUpdate(
      roomId,
      { 
        $pull: { players: { userId: userId } } 
      },
      { new: true } // Return updated doc
    );

    if (!room) {
      // Room might be deleted or not found
      // Still clear user's currentRoom to fix state
      await User.findByIdAndUpdate(userId, { currentRoom: null });
      return res.json({ success: true, message: 'Left room successfully (Room not found)' });
    }

    // If room is empty, delete it immediately
    if (room.players.length === 0) {
      await Room.findByIdAndDelete(roomId);
    }

    // Update user's current room
    await User.findByIdAndUpdate(userId, { currentRoom: null });

    res.json({ 
      success: true, 
      message: 'Left room successfully'
    });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
