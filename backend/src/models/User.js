const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    minlength: 6
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  authMethod: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  displayName: {
    type: String,
    default: function() { return this.username; }
  },
  avatar: {
    type: String,
    default: '/avatars/default.png'
  },
  coins: {
    type: Number,
    default: 10000,
    min: 0
  },
  totalCoinsEarned: {
    type: Number,
    default: 0
  },
  totalCoinsSpent: {
    type: Number,
    default: 0
  },
  refillCount: {
    type: Number,
    default: 0
  },
  lastRefillDate: {
    type: Date
  },
  lastDailyBonus: {
    type: Date
  },
  // Personal Information
  fullName: String,
  dateOfBirth: Date,
  phoneNumber: String,
  bankAccount: {
    bankName: String,
    accountNumber: String,
    accountHolder: String
  },
  // Game Stats
  stats: {
    pokerGamesPlayed: { type: Number, default: 0 },
    pokerGamesWon: { type: Number, default: 0 },
    xitoGamesPlayed: { type: Number, default: 0 },
    xitoGamesWon: { type: Number, default: 0 },
    totalWinnings: { type: Number, default: 0 },
    totalLosses: { type: Number, default: 0 },
    biggestWin: { type: Number, default: 0 },
    biggestLoss: { type: Number, default: 0 }
  },
  // Inventory
  inventory: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    quantity: { type: Number, default: 1 },
    acquiredDate: { type: Date, default: Date.now }
  }],
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: String,
  isAdmin: {
    type: Boolean,
    default: false
  },
  vipLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  currentRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
  socketId: String,
  refreshToken: String
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Add coins method
userSchema.methods.addCoins = function(amount, source = 'game') {
  this.coins += amount;
  this.totalCoinsEarned += amount;
  return this.save();
};

// Deduct coins method
userSchema.methods.deductCoins = function(amount) {
  if (this.coins < amount) {
    throw new Error('Insufficient coins');
  }
  this.coins -= amount;
  this.totalCoinsSpent += amount;
  return this.save();
};

// Daily bonus check - once per calendar day
userSchema.methods.canClaimDailyBonus = function() {
  if (!this.lastDailyBonus) return true;
  
  const now = new Date();
  const lastBonus = new Date(this.lastDailyBonus);
  
  // Check if it's a different calendar day
  const nowDay = now.toDateString();
  const lastBonusDay = lastBonus.toDateString();
  
  return nowDay !== lastBonusDay;
};

// Auto refill check
userSchema.methods.canAutoRefill = function() {
  const maxRefills = parseInt(process.env.MAX_REFILL_COUNT) || 3;
  
  if (!this.lastRefillDate) {
    return this.refillCount < maxRefills;
  }
  
  const now = new Date();
  const lastRefill = new Date(this.lastRefillDate);
  const diffTime = Math.abs(now - lastRefill);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Reset refill count daily
  if (diffDays >= 1) {
    this.refillCount = 0;
    return true;
  }
  
  return this.refillCount < maxRefills;
};

module.exports = mongoose.model('User', userSchema);
