const express = require('express');
const router = express.Router();
const GameHistory = require('../models/GameHistory');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/game/history
// @desc    Get game history
// @access  Private
router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, gameType } = req.query;

    const query = { 'players.userId': req.user.id };
    if (gameType) query.gameType = gameType;

    const history = await GameHistory.find(query)
      .populate('players.userId', 'username displayName avatar')
      .populate('winner.userId', 'username displayName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await GameHistory.countDocuments(query);

    res.json({
      success: true,
      history,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/game/leaderboard
// @desc    Get leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const { gameType = 'all', period = 'all-time' } = req.query;

    let sortField;
    if (gameType === 'poker') {
      sortField = 'stats.pokerGamesWon';
    } else if (gameType === 'xito') {
      sortField = 'stats.xitoGamesWon';
    } else {
      sortField = 'stats.totalWinnings';
    }

    const leaderboard = await User.find({ isBanned: false })
      .select('username displayName avatar stats coins')
      .sort({ [sortField]: -1 })
      .limit(100);

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
