const PokerHandEvaluator = require('../utils/pokerHandEvaluator');
const User = require('../models/User');
const GameHistory = require('../models/GameHistory');
const Transaction = require('../models/Transaction');

class PokerGame {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.evaluator = new PokerHandEvaluator();
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.dealerSeat = 0;
    this.currentTurn = 0;
    this.roundName = 'pre-flop';
    this.smallBlind = room.minBet;
    this.bigBlind = room.minBet * 2;
    this.turnTimer = null;
    this.gameStartTime = null;
  }

  async start() {
    this.gameStartTime = new Date();
    this.room.status = 'playing';
    
    // Initialize deck
    this.deck = this.evaluator.shuffleDeck(this.evaluator.createDeck());
    
    // Set dealer (first game: random, subsequent: next player)
    if (this.room.dealerSeat === undefined) {
      this.room.dealerSeat = Math.floor(Math.random() * this.room.players.length);
    }
    
    // Deal hole cards
    this.dealHoleCards();
    
    // Post blinds
    await this.postBlinds();
    
    // Start pre-flop betting round
    this.currentTurn = this.getNextPlayerSeat(this.room.dealerSeat, 2); // UTG (after blinds)
    this.startTurnTimer();
    
    await this.room.save();
  }

  dealHoleCards() {
    for (const player of this.room.players) {
      player.cards = [this.deck.pop(), this.deck.pop()];
      player.isFolded = false;
      player.bet = 0;
      player.totalBet = 0;
      player.action = 'waiting';
    }
  }

  async postBlinds() {
    const smallBlindPlayer = this.getPlayerBySeat(this.getNextPlayerSeat(this.room.dealerSeat, 1));
    const bigBlindPlayer = this.getPlayerBySeat(this.getNextPlayerSeat(this.room.dealerSeat, 2));
    
    // Small blind
    smallBlindPlayer.bet = this.smallBlind;
    smallBlindPlayer.totalBet = this.smallBlind;
    smallBlindPlayer.coins -= this.smallBlind;
    this.pot += this.smallBlind;
    
    // Big blind
    bigBlindPlayer.bet = this.bigBlind;
    bigBlindPlayer.totalBet = this.bigBlind;
    bigBlindPlayer.coins -= this.bigBlind;
    this.pot += this.bigBlind;
    this.currentBet = this.bigBlind;
    
    // Update users in database
    await User.findByIdAndUpdate(smallBlindPlayer.userId, { 
      $inc: { coins: -this.smallBlind } 
    });
    await User.findByIdAndUpdate(bigBlindPlayer.userId, { 
      $inc: { coins: -this.bigBlind } 
    });
  }

  async handlePlayerAction(userId, action, amount = 0) {
    const player = this.room.players.find(p => p.userId.toString() === userId);
    
    if (!player) {
      return { success: false, message: 'Player not in game' };
    }

    const currentPlayer = this.getPlayerBySeat(this.currentTurn);
    if (currentPlayer.userId.toString() !== userId) {
      return { success: false, message: 'Not your turn' };
    }

    let actionValid = false;

    switch (action) {
      case 'fold':
        player.isFolded = true;
        player.action = 'fold';
        actionValid = true;
        break;

      case 'check':
        if (player.bet === this.currentBet) {
          player.action = 'check';
          actionValid = true;
        }
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
        if (amount >= this.currentBet * 2 && player.coins >= amount) {
          const betAmount = amount - player.bet;
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

      case 'all-in':
        const allInAmount = player.coins;
        player.totalBet += allInAmount;
        this.pot += allInAmount;
        if (player.totalBet > this.currentBet) {
          this.currentBet = player.totalBet;
        }
        player.coins = 0;
        player.isAllIn = true;
        player.action = 'all-in';
        actionValid = true;
        
        await User.findByIdAndUpdate(userId, { $set: { coins: 0 } });
        break;
    }

    if (!actionValid) {
      return { success: false, message: 'Invalid action' };
    }

    // Clear turn timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }

    // Move to next player
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 1) {
      // Only one player left, they win
      return await this.endGame(activePlayers[0]);
    }

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      return await this.nextBettingRound();
    }

    // Move to next active player
    this.currentTurn = this.getNextActivePlayerSeat(this.currentTurn);
    this.startTurnTimer();

    await this.room.save();

    return { success: true };
  }

  isBettingRoundComplete() {
    const activePlayers = this.getActivePlayers();
    
    // All active players have acted and matched the current bet
    return activePlayers.every(p => 
      (p.action !== 'waiting' && p.bet === this.currentBet) || p.isAllIn
    );
  }

  async nextBettingRound() {
    // Reset player actions and bets for new round
    for (const player of this.room.players) {
      player.bet = 0;
      player.action = 'waiting';
    }
    this.currentBet = 0;

    switch (this.roundName) {
      case 'pre-flop':
        // Deal flop (3 cards)
        this.communityCards = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
        this.roundName = 'flop';
        break;

      case 'flop':
        // Deal turn (1 card)
        this.communityCards.push(this.deck.pop());
        this.roundName = 'turn';
        break;

      case 'turn':
        // Deal river (1 card)
        this.communityCards.push(this.deck.pop());
        this.roundName = 'river';
        break;

      case 'river':
        // Showdown
        return await this.showdown();
    }

    // Start new betting round from player after dealer
    this.currentTurn = this.getNextActivePlayerSeat(this.room.dealerSeat);
    this.startTurnTimer();

    await this.room.save();

    return { 
      success: true, 
      roundEnded: true, 
      roundData: {
        roundName: this.roundName,
        communityCards: this.communityCards
      }
    };
  }

  async showdown() {
    const activePlayers = this.getActivePlayers();
    
    // Evaluate all hands
    const hands = activePlayers.map(player => {
      const allCards = [...player.cards, ...this.communityCards];
      const hand = this.evaluator.evaluateHand(allCards);
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
      user.stats.pokerGamesWon += 1;
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
        description: `Poker win: ${winners[0].hand.name}`,
        metadata: { roomId: this.room._id }
      });
    }

    // Update losers
    for (const player of this.room.players) {
      if (!winners.some(w => w.player.userId.toString() === player.userId.toString())) {
        const user = await User.findById(player.userId);
        user.stats.pokerGamesPlayed += 1;
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
      gameType: 'poker',
      players: this.room.players.map(p => ({
        userId: p.userId,
        seat: p.seat,
        cards: p.cards,
        totalBet: p.totalBet,
        isWinner: winners.some(w => w.player.userId.toString() === p.userId.toString())
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

    return await this.endGame(winners[0].player, {
      winners,
      winAmount,
      handRank: winners[0].hand.name,
      communityCards: this.communityCards
    });
  }

  async endGame(winner, gameData = null) {
    // Set to finished temporarily for game end display
    this.room.status = 'finished';
    await this.room.save();

    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }
    
    // After 3 seconds, reset room to waiting state for next game
    setTimeout(async () => {
      try {
        this.room.status = 'waiting';
        await this.room.save();
        console.log('✅ [PokerGame] Room status reset to waiting for next game');
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

  getNextPlayerSeat(currentSeat, offset = 1) {
    const seats = this.room.players.map(p => p.seat).sort((a, b) => a - b);
    const currentIndex = seats.indexOf(currentSeat);
    const nextIndex = (currentIndex + offset) % seats.length;
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
    const turnDuration = 30000; // 30 seconds
    
    this.turnTimer = setTimeout(async () => {
      // Auto-fold if player doesn't act
      const currentPlayer = this.getPlayerBySeat(this.currentTurn);
      await this.handlePlayerAction(currentPlayer.userId.toString(), 'fold');
      
      this.io.to(`room:${this.room._id}`).emit('player-timeout', {
        userId: currentPlayer.userId,
        seat: currentPlayer.seat
      });
    }, turnDuration);
  }

  getPublicState() {
    return {
      roomId: this.room._id,
      gameType: 'poker',
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
        cardCount: p.cards?.length || 0
      })),
      communityCards: this.communityCards,
      pot: this.pot,
      currentBet: this.currentBet,
      currentTurn: this.currentTurn,
      roundName: this.roundName,
      dealerSeat: this.room.dealerSeat,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      timer: 30
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
      console.error('❌ [PokerGame getPrivateState] Player NOT found for userId:', targetUserId);
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
    
    console.log('✅ [PokerGame getPrivateState] Returning private state with', player.cards?.length || 0, 'cards for user:', targetUserId);
    
    return {
      ...publicState,
      players: playersWithMyCards,
      myCards: player.cards || [],
      myUserId: targetUserId,
      timer: 30
    };
  }

  broadcastGameState() {
    console.log('📡 [PokerGame BROADCAST] Starting broadcast for', this.room.players.length, 'players');
    
    // Send personalized state to each player
    for (const player of this.room.players) {
      const userId = player.userId._id || player.userId;
      const userIdStr = userId.toString();
      
      // Get the user's socket
      const userSocket = Array.from(this.io.sockets.sockets.values()).find(
        socket => socket.userId === userIdStr
      );
      
      if (userSocket) {
        // Send private state to this specific user
        const privateState = this.getPrivateState(userIdStr);
        
        console.log(`✅ [PokerGame BROADCAST] Sending to ${userIdStr}:`, {
          hasMyCards: !!privateState.myCards,
          myCardsLength: privateState.myCards?.length,
          socketId: userSocket.id
        });
        
        userSocket.emit('game-state-update', privateState);
      } else {
        console.log(`❌ [PokerGame BROADCAST] No socket found for userId: ${userIdStr}`);
      }
    }
    
    // Also broadcast public state for spectators
    this.io.to(`room:${this.room._id}`).emit('game-state-public', this.getPublicState());
  }

  async playerFold(userId) {
    return await this.handlePlayerAction(userId, 'fold');
  }
}

module.exports = PokerGame;
