const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  gameType: {
    type: String,
    enum: ['poker', 'xito'],
    required: true
  },
  minBet: {
    type: Number,
    required: true,
    default: 100
  },
  maxBet: {
    type: Number,
    required: true,
    default: 10000
  },
  zone: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  zoneRequirement: {
    minCoins: { type: Number, default: 0 },
    maxCoins: { type: Number, default: 5000 }
  },
  minPlayers: {
    type: Number,
    default: 2,
    min: 2
  },
  maxPlayers: {
    type: Number,
    default: 7,
    max: 7
  },
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    seat: { type: Number, min: 0, max: 6 },
    coins: Number,
    cards: [String],
    bet: { type: Number, default: 0 },
    totalBet: { type: Number, default: 0 },
    action: { type: String, enum: ['waiting', 'fold', 'check', 'call', 'bet', 'raise', 'all-in'] },
    isFolded: { type: Boolean, default: false },
    isAllIn: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting'
  },
  currentRound: {
    type: String,
    enum: ['pre-flop', 'flop', 'turn', 'river', 'showdown'],
    default: 'pre-flop'
  },
  pot: {
    type: Number,
    default: 0
  },
  communityCards: [String],
  dealerSeat: {
    type: Number,
    default: 0
  },
  currentTurn: {
    type: Number,
    default: 0
  },
  currentBet: {
    type: Number,
    default: 0
  },
  deck: [String],
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gameHistory: [{
    roundNumber: Number,
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    winAmount: Number,
    handRank: String,
    timestamp: { type: Date, default: Date.now }
  }],
  turnTimer: {
    duration: { type: Number, default: 30 }, // seconds
    startTime: Date
  },
  autoDeleteAt: {
    type: Date,
    index: true // For efficient cleanup queries
  }
}, {
  timestamps: true
});

// Get available seats
roomSchema.methods.getAvailableSeats = function() {
  const occupiedSeats = this.players.map(p => p.seat);
  const allSeats = Array.from({ length: this.maxPlayers }, (_, i) => i);
  return allSeats.filter(seat => !occupiedSeats.includes(seat));
};

// Check if room is full
roomSchema.methods.isFull = function() {
  return this.players.length >= this.maxPlayers;
};

// Check if room can start
roomSchema.methods.canStart = function() {
  return this.players.length >= this.minPlayers && this.status === 'waiting';
};

// Get active players (not folded)
roomSchema.methods.getActivePlayers = function() {
  return this.players.filter(p => !p.isFolded);
};

// Get next player seat
roomSchema.methods.getNextPlayerSeat = function(currentSeat) {
  const activePlayers = this.getActivePlayers();
  if (activePlayers.length === 0) return null;
  
  const currentIndex = activePlayers.findIndex(p => p.seat === currentSeat);
  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex].seat;
};

module.exports = mongoose.model('Room', roomSchema);
