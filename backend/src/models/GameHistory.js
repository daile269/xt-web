const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  gameType: {
    type: String,
    enum: ['poker', 'xito'],
    required: true
  },
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    seat: Number,
    startingCoins: Number,
    endingCoins: Number,
    cards: [String],
    actions: [{
      round: String,
      action: String,
      amount: Number,
      timestamp: Date
    }],
    handRank: String,
    isWinner: Boolean
  }],
  rounds: [{
    roundName: String,
    communityCards: [String],
    pot: Number,
    actions: [{
      playerId: mongoose.Schema.Types.ObjectId,
      action: String,
      amount: Number,
      timestamp: Date
    }]
  }],
  winner: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    handRank: String,
    winAmount: Number
  },
  totalPot: Number,
  houseRake: Number,
  jackpotContribution: Number,
  duration: Number, // seconds
  startedAt: Date,
  endedAt: Date
}, {
  timestamps: true
});

// Indexes
gameHistorySchema.index({ roomId: 1, createdAt: -1 });
gameHistorySchema.index({ 'players.userId': 1 });
gameHistorySchema.index({ gameType: 1 });

module.exports = mongoose.model('GameHistory', gameHistorySchema);
