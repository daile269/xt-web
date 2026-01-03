const XiToHandEvaluator = require('../utils/xiToHandEvaluator');
const User = require('../models/User');
const GameHistory = require('../models/GameHistory');
const Transaction = require('../models/Transaction');

class XiToGame {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.evaluator = new XiToHandEvaluator();
    this.deck = [];
    this.pot = 0;
    this.currentBet = 0;
    this.dealerSeat = 0;
    this.currentTurn = 0;
    this.roundNumber = 1; // Rounds 1-5 (3, 4, 5, 6, 7 cards)
    this.turnTimer = null;
    this.gameStartTime = null;
    this.anteAmount = room.minBet;
    this.lastRaiser = null; // Track who raised last to know when betting round is complete
    this.actionCount = 0; // Count actions in current round
    
    // Betting configuration based on room settings
    // Format: [ante, round4, round5, round6, round7]
    // Example: 1-3-5-5 means ante=1k, round4=3k, round5=5k, round6=5k, round7=5k
    this.bettingConfig = this.parseBettingConfig(room.bettingStructure || '1-2-3-3');
  }

  parseBettingConfig(structure) {
    const parts = structure.split('-').map(n => parseInt(n) * 1000);
    return {
      ante: parts[0] || 1000,
      round4: parts[1] || 2000,
      round5: parts[2] || 3000,
      round6: parts[3] || 3000,
      round7: parts[3] || 3000, // Same as round6 if not specified
      minBet: 1000,
      maxBetMultiplier: 3 // Can bet up to 3x the round bet
    };
  }

  async start() {
    this.gameStartTime = new Date();
    
    // Reset room status to playing (in case it was 'finished' from previous game)
    this.room.status = 'playing';
    
    // Initialize deck
    this.deck = this.evaluator.shuffleDeck(this.evaluator.createDeck());
    
    // Set dealer
    if (this.room.dealerSeat === undefined) {
      this.room.dealerSeat = Math.floor(Math.random() * this.room.players.length);
    }
    
    // Post antes
    await this.postAntes();
    
    // Deal first round (3 cards) - all face down (úp tẩy)
    this.dealCards(3, 0); // 3 cards, 0 visible
    
    // Start betting from player after dealer
    this.currentTurn = this.getNextPlayerSeat(this.room.dealerSeat);
    this.lastRaiser = null; // No one has raised yet
    this.actionCount = 0; // Reset action count
    
    console.log('🎮 Game started:', {
      dealerSeat: this.room.dealerSeat,
      currentTurn: this.currentTurn,
      players: this.room.players.map(p => ({ seat: p.seat, username: p.userId?.username }))
    });
    this.startTurnTimer();
    
    await this.room.save();
    
    this.broadcastGameState();
  }

  async postAntes() {
    for (const player of this.room.players) {
      player.bet = this.bettingConfig.ante;
      player.totalBet = this.bettingConfig.ante;
      player.coins -= this.bettingConfig.ante;
      this.pot += this.bettingConfig.ante;
      player.isFolded = false;
      player.isAllIn = false;
      player.action = 'waiting';
      player.cards = [];
      player.visibleCards = [];
      
      await User.findByIdAndUpdate(player.userId, { 
        $inc: { coins: -this.bettingConfig.ante } 
      });
    }
    
    this.currentBet = this.bettingConfig.ante;
  }

  /**
   * Deal cards to players
   * @param {number} totalCards - Total number of cards each player should have
   * @param {number} visibleCount - Number of visible (face-up) cards
   */
  dealCards(totalCards, visibleCount) {
    for (const player of this.room.players) {
      if (!player.isFolded) {
        // Initialize arrays if needed
        if (!player.cards) player.cards = [];
        if (!player.visibleCards) player.visibleCards = [];
        
        const cardsToDeal = totalCards - player.cards.length;
        
        for (let i = 0; i < cardsToDeal; i++) {
          const card = this.deck.pop();
          player.cards.push(card);
          
          // Determine if this card should be visible
          const currentTotal = player.cards.length;
          if (currentTotal > (totalCards - visibleCount)) {
            player.visibleCards.push(card);
          }
        }
      }
    }
  }

  /**
   * Determine who should bet first based on visible cards
   */
  determineFirstBetter() {
    const activePlayers = this.getActivePlayers();
    
    // Evaluate visible cards for each player
    const hands = activePlayers.map(player => {
      const hand = this.evaluator.evaluateVisibleCards(player.visibleCards || []);
      return { player, hand };
    });

    // Sort by hand strength (highest first)
    hands.sort((a, b) => this.evaluator.compareVisibleHands(b.hand, a.hand));

    // Return the player with the best visible hand
    return hands[0].player.seat;
  }

  async handlePlayerAction(userId, action, amount = 0) {
    // Normalize userId to string
    const userIdStr = userId?._id ? userId._id.toString() : 
                     (userId?.toString ? userId.toString() : String(userId));
    
    // Handle both populated (object) and non-populated (string) userId in players
    const player = this.room.players.find(p => {
      const pUserId = p.userId?._id ? p.userId._id.toString() : p.userId.toString();
      return pUserId === userIdStr;
    });
    
    if (!player) {
      console.error('❌ [XiToGame] Player not found for userId:', userIdStr);
      return { success: false, message: 'Player not in game' };
    }

    const currentPlayer = this.getPlayerBySeat(this.currentTurn);
    const currentUserId = currentPlayer.userId?._id ? currentPlayer.userId._id.toString() : currentPlayer.userId.toString();
    
    if (currentUserId !== userIdStr) {
      return { success: false, message: 'Not your turn' };
    }

    // Get betting limits for current round
    const limits = this.getBettingLimits();
    let actionValid = false;

    switch (action) {
      case 'fold':
        player.isFolded = true;
        player.action = 'fold';
        actionValid = true;
        break;

      case 'call':
        const callAmount = this.currentBet - player.bet;
        if (player.coins >= callAmount) {
          player.coins -= callAmount;
          player.bet = this.currentBet;
          player.totalBet += callAmount;
          this.pot += callAmount;
          player.action = 'call';
          actionValid = true;
          
          await User.findByIdAndUpdate(userId, { $inc: { coins: -callAmount } });
        }
        break;

      case 'bet':
      case 'raise':
        // Validate bet amount is within limits
        if (amount < limits.min || amount > limits.max) {
          return { 
            success: false, 
            message: `Bet must be between ${limits.min} and ${limits.max}` 
          };
        }

        const betAmount = amount - player.bet;
        if (player.coins >= betAmount) {
          player.coins -= betAmount;
          player.bet = amount;
          player.totalBet += betAmount;
          this.pot += betAmount;
          this.currentBet = amount;
          player.action = action;
          actionValid = true;
          
          await User.findByIdAndUpdate(userId, { $inc: { coins: -betAmount } });
        }
        break;

      case 'check':
        // Can only check if current bet equals player's bet
        if (this.currentBet === player.bet) {
          player.action = 'check';
          actionValid = true;
        }
        break;
    }

    if (!actionValid) {
      console.log('❌ [XiToGame] Invalid action');
      return { success: false, message: 'Invalid action' };
    }

    // Track action
    this.actionCount++;
    
    // Track last raiser
    if (action === 'bet' || action === 'raise') {
      this.lastRaiser = this.currentTurn;
    }
    
    console.log('🎮 [XiToGame] Action valid, actionCount:', this.actionCount, 'lastRaiser:', this.lastRaiser);

    // Clear turn timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }

    // Broadcast action to all players
    this.io.to(`room:${this.room._id}`).emit('player-action', {
      userId: player.userId,
      action,
      amount,
      pot: this.pot,
      currentBet: this.currentBet
    });

    // Check if only one player left (others folded)
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      const winAmount = this.pot;
      
      // Build detailed player info
      const allPlayersInfo = this.room.players.map(p => {
        const userId = p.userId._id || p.userId;
        const userData = p.userId;
        return {
          userId: userId,
          username: userData?.username || userData?.displayName || 'Player',
          avatar: userData?.avatar,
          cards: p.cards || [],
          isFolded: p.isFolded || false
        };
      });
      
      const emitData = {
        winner: {
          userId: winner.userId._id || winner.userId,
          username: winner.userId?.username || winner.userId?.displayName,
          avatar: winner.userId?.avatar,
          cards: winner.cards || []
        },
        allPlayers: allPlayersInfo,
        winAmount,
        pot: this.pot,
        reason: 'fold'
      };
      
      console.log('🎮 [FOLD WIN] Emitting game-ended:', {
        winner: emitData.winner.username,
        allPlayers: emitData.allPlayers.map(p => ({
          username: p.username,
          cards: p.cards,
          cardsCount: p.cards?.length,
          isFolded: p.isFolded
        })),
        roomId: this.room._id
      });
      console.log('🎮 [FOLD WIN] Full emitData:', JSON.stringify(emitData, null, 2));
      
      // Emit game-ended event with all players info
      this.io.to(`room:${this.room._id}`).emit('game-ended', emitData);
      
      return await this.endGame(winner);
    }

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      return await this.nextBettingRound();
    }

    // Move to next active player
    this.currentTurn = this.getNextActivePlayerSeat(this.currentTurn);
    this.startTurnTimer();

    try {
      await this.room.save();
    } catch (error) {
      // Ignore version conflicts - room will be saved on next action
      if (error.name !== 'VersionError') {
        console.error('Error saving room:', error);
      }
    }
    
    this.broadcastGameState();

    return { success: true };
  }

  getBettingLimits() {
    const config = this.bettingConfig;
    let roundBet = config.ante;

    switch (this.roundNumber) {
      case 1: // 3 cards
        roundBet = config.ante;
        break;
      case 2: // 4 cards
        roundBet = config.round4;
        break;
      case 3: // 5 cards
        roundBet = config.round5;
        break;
      case 4: // 6 cards
        roundBet = config.round6;
        break;
      case 5: // 7 cards
        roundBet = config.round7;
        break;
    }

    return {
      min: config.minBet,
      max: roundBet * config.maxBetMultiplier,
      suggested: roundBet
    };
  }

  isBettingRoundComplete() {
    const activePlayers = this.getActivePlayers();
    
    console.log('🎮 [XiToGame] Checking if betting round complete:', {
      activePlayerCount: activePlayers.length,
      actionCount: this.actionCount,
      lastRaiser: this.lastRaiser,
      currentBet: this.currentBet,
      players: activePlayers.map(p => ({
        seat: p.seat,
        action: p.action,
        bet: p.bet,
        isFolded: p.isFolded
      }))
    });
    
    // Need at least one action per active player
    if (this.actionCount < activePlayers.length) {
      console.log('🎮 [XiToGame] Not enough actions yet');
      return false;
    }
    
    // Check if all active players have acted and matched the current bet
    const allMatched = activePlayers.every(p => {
      const hasActed = p.action !== 'waiting';
      const hasMatchedBet = p.bet === this.currentBet || p.isAllIn;
      return hasActed && hasMatchedBet;
    });
    
    console.log('🎮 [XiToGame] All matched:', allMatched);
    
    // If someone raised, everyone after them must have a chance to act
    if (this.lastRaiser !== null && allMatched) {
      // Check if we've gone full circle back to the raiser
      const raiserHasActed = activePlayers.find(p => p.seat === this.lastRaiser)?.action !== 'waiting';
      console.log('🎮 [XiToGame] Raiser has acted:', raiserHasActed);
      return raiserHasActed && allMatched;
    }
    
    return allMatched;
  }

  async nextBettingRound() {
    console.log('🎮 [XiToGame] ===== NEXT BETTING ROUND =====');
    console.log('🎮 [XiToGame] Current round:', this.roundNumber);
    
    // Reset for next round
    for (const player of this.room.players) {
      player.bet = 0;
      player.action = 'waiting';
    }
    this.currentBet = 0;
    this.lastRaiser = null;
    this.actionCount = 0;

    // Move to next round
    this.roundNumber++;

    // Check if we've completed all rounds (after 7 cards)
    if (this.roundNumber > 5) {
      return await this.showdown();
    }

    // Deal more cards with proper visible/hidden distribution
    const cardsConfig = [
      { total: 3, visible: 0 },  // Round 1: 3 cards, all hidden
      { total: 4, visible: 2 },  // Round 2: 4 cards, 2 visible (2 úp, 2 ngửa)
      { total: 5, visible: 3 },  // Round 3: 5 cards, 3 visible
      { total: 6, visible: 4 },  // Round 4: 6 cards, 4 visible
      { total: 7, visible: 5 }   // Round 5: 7 cards, 5 visible
    ];

    const config = cardsConfig[this.roundNumber - 1];
    console.log('🎮 [XiToGame] Dealing cards:', config);
    this.dealCards(config.total, config.visible);

    // Determine who bets first based on visible cards (from round 2 onwards)
    if (this.roundNumber >= 2) {
      this.currentTurn = this.determineFirstBetter();
      console.log('🎮 [XiToGame] First better (best visible hand):', this.currentTurn);
    } else {
      this.currentTurn = this.getNextActivePlayerSeat(this.room.dealerSeat);
      console.log('🎮 [XiToGame] First better (after dealer):', this.currentTurn);
    }

    this.startTurnTimer();

    await this.room.save();
    
    this.io.to(`room:${this.room._id}`).emit('new-round', {
      roundNumber: this.roundNumber,
      cardsDealt: config.total,
      visibleCards: config.visible,
      currentTurn: this.currentTurn,
      bettingLimits: this.getBettingLimits()
    });

    this.broadcastGameState();
    
    console.log('🎮 [XiToGame] Round', this.roundNumber, 'started, current turn:', this.currentTurn);

    return { 
      success: true, 
      roundEnded: true, 
      roundData: {
        roundNumber: this.roundNumber,
        cardsDealt: config.total,
        visibleCards: config.visible
      }
    };
  }

  async showdown() {
    const activePlayers = this.getActivePlayers();
    
    // Evaluate all hands
    const hands = activePlayers.map(player => {
      const hand = this.evaluator.evaluateHand(player.cards);
      return { player, hand };
    });

    // Find winner(s)
    hands.sort((a, b) => this.evaluator.compareHands(b.hand, a.hand));
    const winners = [hands[0]];
    
    // Check for ties
    for (let i = 1; i < hands.length; i++) {
      if (this.evaluator.compareHands(hands[i].hand, winners[0].hand) === 0) {
        winners.push(hands[i]);
      } else {
        break;
      }
    }

    // Calculate house rake
    const rakePercentage = parseFloat(process.env.HOUSE_RAKE_PERCENTAGE) || 5;
    const jackpotPercentage = parseFloat(process.env.JACKPOT_PERCENTAGE) || 2;
    
    const rake = Math.floor(this.pot * (rakePercentage / 100));
    const jackpotContribution = Math.floor(this.pot * (jackpotPercentage / 100));
    const netPot = this.pot - rake;
    const winAmount = Math.floor(netPot / winners.length);

    // Award winnings
    for (const { player } of winners) {
      player.coins += winAmount;
      
      const user = await User.findById(player.userId);
      user.coins += winAmount;
      user.stats.xitoGamesWon += 1;
      user.stats.totalWinnings += winAmount;
      if (winAmount > user.stats.biggestWin) {
        user.stats.biggestWin = winAmount;
      }
      await user.save();

      // Transaction
      await Transaction.create({
        userId: player.userId,
        type: 'game-win',
        amount: winAmount,
        balanceBefore: user.coins - winAmount,
        balanceAfter: user.coins,
        status: 'completed',
        description: `Xì Tố win: ${winners[0].hand.name}`,
        metadata: { roomId: this.room._id }
      });
    }

    // Update losers
    for (const player of this.room.players) {
      const isWinner = winners.some(w => {
        const wUserId = w.player.userId?._id ? w.player.userId._id.toString() : w.player.userId.toString();
        const pUserId = player.userId?._id ? player.userId._id.toString() : player.userId.toString();
        return wUserId === pUserId;
      });
      
      if (!isWinner) {
        const userId = player.userId?._id || player.userId;
        const user = await User.findById(userId);
        user.stats.xitoGamesPlayed += 1;
        user.stats.totalLosses += player.totalBet;
        if (player.totalBet > user.stats.biggestLoss) {
          user.stats.biggestLoss = player.totalBet;
        }
        await user.save();
      }
    }

    // Save game history
    await GameHistory.create({
      roomId: this.room._id,
      gameType: 'xito',
      players: this.room.players.map(p => ({
        userId: p.userId,
        seat: p.seat,
        cards: p.cards,
        totalBet: p.totalBet,
        handRank: this.evaluator.evaluateHand(p.cards || []).name,
        isWinner: winners.some(w => {
          const wUserId = w.player.userId?._id ? w.player.userId._id.toString() : w.player.userId.toString();
          const pUserId = p.userId?._id ? p.userId._id.toString() : p.userId.toString();
          return wUserId === pUserId;
        })
      })),
      winner: {
        userId: winners[0].player.userId,
        handRank: winners[0].hand.name,
        winAmount
      },
      totalPot: this.pot,
      houseRake: rake,
      jackpotContribution,
      startedAt: this.gameStartTime,
      endedAt: new Date()
    });

    // Broadcast showdown results
    this.io.to(`room:${this.room._id}`).emit('showdown', {
      winners: winners.map(w => ({
        userId: w.player.userId,
        handRank: w.hand.name,
        cards: w.player.cards
      })),
      allHands: hands.map(h => ({
        userId: h.player.userId,
        handRank: h.hand.name,
        cards: h.player.cards
      })),
      winAmount,
      pot: this.pot
    });

    // Emit game-ended event after showdown
    setTimeout(() => {
      // Build allPlayers array with complete info for frontend display
      const allPlayersInfo = this.room.players.map(p => {
        const playerUserId = p.userId?._id ? p.userId._id.toString() : p.userId.toString();
        const isWinner = winners.some(w => {
          const wUserId = w.player.userId?._id ? w.player.userId._id.toString() : w.player.userId.toString();
          return wUserId === playerUserId;
        });
        
        return {
          userId: p.userId?._id || p.userId,
          username: p.userId?.username || p.userId?.displayName || 'Người chơi',
          avatar: p.userId?.avatar,
          cards: p.cards || [],
          handRank: this.evaluator.evaluateHand(p.cards || []).name,
          isFolded: p.isFolded || false,
          isWinner: isWinner
        };
      });
      
      console.log('🎮 [SHOWDOWN] All players info:', allPlayersInfo.map(p => ({
        username: p.username,
        cards: p.cards,
        cardsCount: p.cards?.length,
        handRank: p.handRank
      })));
      
      this.io.to(`room:${this.room._id}`).emit('game-ended', {
        winner: {
          userId: winners[0].player.userId,
          username: winners[0].player.userId.username || winners[0].player.userId.displayName,
          avatar: winners[0].player.userId.avatar,
          handRank: winners[0].hand.name,
          cards: winners[0].player.cards
        },
        allPlayers: allPlayersInfo,
        winAmount,
        pot: this.pot,
        reason: 'showdown'
      });
    }, 3000);

    return await this.endGame(winners[0].player, {
      winners,
      winAmount,
      handRank: winners[0].hand.name,
      allHands: hands
    });
  }

  async endGame(winner, gameData = null) {
    // Set to finished temporarily for game end display
    this.room.status = 'finished';
    
    try {
      await this.room.save();
    } catch (error) {
      // Ignore version conflicts
      if (error.name !== 'VersionError') {
        console.error('Error saving room in endGame:', error);
      }
    }

    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }
    
    // After 3 seconds, reset room to waiting state for next game
    setTimeout(async () => {
      try {
        this.room.status = 'waiting';
        await this.room.save();
        console.log('✅ Room status reset to waiting for next game');
      } catch (error) {
        console.error('Error resetting room status:', error);
      }
    }, 3000);

    return {
      success: true,
      gameEnded: true,
      gameData: {
        winner,
        ...gameData
      }
    };
  }

  getActivePlayers() {
    return this.room.players.filter(p => !p.isFolded);
  }

  getPlayerBySeat(seat) {
    return this.room.players.find(p => p.seat === seat);
  }

  getNextPlayerSeat(currentSeat) {
    const seats = this.room.players.map(p => p.seat).sort((a, b) => a - b);
    const currentIndex = seats.indexOf(currentSeat);
    const nextIndex = (currentIndex + 1) % seats.length;
    return seats[nextIndex];
  }

  getNextActivePlayerSeat(currentSeat) {
    let nextSeat = this.getNextPlayerSeat(currentSeat);
    let attempts = 0;
    
    while (attempts < this.room.players.length) {
      const player = this.getPlayerBySeat(nextSeat);
      if (!player.isFolded && !player.isAllIn) {
        return nextSeat;
      }
      nextSeat = this.getNextPlayerSeat(nextSeat);
      attempts++;
    }
    
    return currentSeat;
  }

  startTurnTimer() {
    const turnDuration = 45000; // 45 seconds
    
    this.turnTimer = setTimeout(async () => {
      const currentPlayer = this.getPlayerBySeat(this.currentTurn);
      
      // Normalize userId properly (handle both populated and non-populated)
      const userIdStr = currentPlayer.userId?._id ? 
                       currentPlayer.userId._id.toString() : 
                       currentPlayer.userId.toString();
      
      await this.handlePlayerAction(userIdStr, 'fold');
      
      this.io.to(`room:${this.room._id}`).emit('player-timeout', {
        userId: currentPlayer.userId,
        seat: currentPlayer.seat
      });
    }, turnDuration);
  }

  broadcastGameState() {
    const publicState = this.getPublicState();
    
    console.log('📡 [BROADCAST] Starting broadcast for', this.room.players.length, 'players');
    
    // Send personalized state to each player via their personal room
    for (const player of this.room.players) {
      const userId = player.userId._id || player.userId;
      const userIdStr = userId.toString();
      
      // Send private state to this specific user's room
      const privateState = this.getPrivateState(userIdStr);
      
      console.log(`✅ [BROADCAST] Sending to user:${userIdStr}:`, {
        hasMyCards: !!privateState.myCards,
        myCardsLength: privateState.myCards?.length
      });
      
      this.io.to(`user:${userIdStr}`).emit('game-state-update', privateState);
    }
    
    // Also broadcast public state to the game room for spectators
    this.io.to(`room:${this.room._id}`).emit('game-state-public', this.getPublicState());
  }

  getPublicState() {
    return {
      roomId: this.room._id,
      gameType: 'xito',
      phase: this.room.status,
      players: this.room.players.map(p => ({
        userId: p.userId,
        seat: p.seat,
        coins: p.coins,
        bet: p.bet,
        totalBet: p.totalBet,
        action: p.action,
        isFolded: p.isFolded,
        isAllIn: p.isAllIn,
        cardCount: p.cards?.length || 0,
        visibleCards: p.visibleCards || []
      })),
      pot: {
        total: this.pot,
        follow: this.currentBet
      },
      currentBet: this.currentBet,
      currentTurn: this.currentTurn,
      roundNumber: this.roundNumber,
      dealerSeat: this.room.dealerSeat,
      bettingLimits: this.getBettingLimits()
    };
  }

  getPrivateState(userId) {
  const publicState = this.getPublicState();
  
  // Normalize userId to string for comparison
  const targetUserId = userId?.toString ? userId.toString() : String(userId);
  
  // Find player in room.players (source of truth for cards)
  const player = this.room.players.find(p => {
    const pUserId = p.userId?._id ? p.userId._id.toString() : p.userId.toString();
    return pUserId === targetUserId;
  });
  
  if (!player) {
    console.error('❌ [getPrivateState] Player NOT found for userId:', targetUserId);
    return publicState;
  }
  
  // Add cards to the matching player in publicState.players
  const playersWithMyCards = publicState.players.map(p => {
    const pUserId = p.userId?._id ? p.userId._id.toString() : 
                    (p.userId?.toString ? p.userId.toString() : String(p.userId));
    
    if (pUserId === targetUserId) {
      return {
        ...p,
        cards: player.cards || [],
        isMe: true
      };
    }
    return p;
  });
  
  return {
    ...publicState,
    players: playersWithMyCards,
    myCards: player.cards || [],
    myUserId: targetUserId
  };
}
  async playerFold(userId) {
    return await this.handlePlayerAction(userId, 'fold');
  }
}

module.exports = XiToGame;
