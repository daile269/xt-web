const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const PokerGame = require('../game/PokerGame');
const XiToGame = require('../game/XiToGame');

// Store active games
const activeGames = new Map();

module.exports = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user || user.isBanned) {
        return next(new Error('User not found or banned'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`✅ User connected: ${socket.user.username} (${socket.userId})`);

    // Update user online status
    await User.findByIdAndUpdate(socket.userId, { 
      isOnline: true, 
      socketId: socket.id 
    });

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Emit online users count
    io.emit('online-users', await User.countDocuments({ isOnline: true }));

    // ==================== LOBBY EVENTS ====================

    // Get room list
    socket.on('get-rooms', async (callback) => {
      try {
        const rooms = await Room.find({ isPrivate: false })
          .populate('players.userId', 'username displayName avatar coins')
          .lean();

        callback({ success: true, rooms });
      } catch (error) {
        callback({ success: false, message: error.message });
      }
    });

    // Create room
    socket.on('create-room', async (data, callback) => {
      try {
        const { name, gameType, minBet, maxBet, zone, isPrivate, password } = data;

        const zoneRequirements = {
          bronze: { minCoins: 0, maxCoins: 5000 },
          silver: { minCoins: 5000, maxCoins: 25000 },
          gold: { minCoins: 25000, maxCoins: 100000 },
          platinum: { minCoins: 100000, maxCoins: Infinity }
        };

        const room = await Room.create({
          name: name || `${gameType.toUpperCase()} - ${zone.toUpperCase()}`,
          gameType,
          minBet,
          maxBet,
          zone: zone || 'bronze',
          zoneRequirement: zoneRequirements[zone || 'bronze'],
          isPrivate: isPrivate || false,
          password,
          createdBy: socket.userId
        });

        // Broadcast new room to lobby
        io.emit('room-created', room);

        callback({ success: true, room });
      } catch (error) {
        callback({ success: false, message: error.message });
      }
    });

    // Join room
    socket.on('join-room', async (data, callback) => {
      try {
        const { roomId, password } = data;
        const room = await Room.findById(roomId);

        if (!room) {
          return callback({ success: false, message: 'Room not found' });
        }

        if (room.isFull()) {
          return callback({ success: false, message: 'Room is full' });
        }

        if (room.isPrivate && room.password !== password) {
          return callback({ success: false, message: 'Incorrect password' });
        }

        const user = await User.findById(socket.userId);

        // Check zone requirements (only minimum - players with more coins can join lower zones)
        if (user.coins < room.zoneRequirement.minCoins) {
          return callback({ 
            success: false, 
            message: `Bạn cần ít nhất ${room.zoneRequirement.minCoins} coins để vào khu vực ${room.zone.toUpperCase()}` 
          });
        }

        // Check minimum coins
        if (user.coins < room.minBet * 10) {
          return callback({ 
            success: false, 
            message: `Bạn cần ít nhất ${room.minBet * 10} coins để vào phòng này` 
          });
        }

        // Check if already in room
        if (room.players.some(p => p.userId.toString() === socket.userId)) {
          return callback({ success: false, message: 'Already in room' });
        }

        // Get available seat
        const availableSeats = room.getAvailableSeats();
        const seat = availableSeats[0];

        // Add player
        room.players.push({
          userId: socket.userId,
          seat,
          coins: user.coins,
          action: 'waiting'
        });

        // Reset room status to 'waiting' if no active game
        const hasActiveGame = activeGames.has(roomId);
        if (!hasActiveGame && room.status !== 'waiting') {
          console.log(`🔄 Resetting room ${roomId} status from '${room.status}' to 'waiting' (no active game)`);
          room.status = 'waiting';
        }

        await room.save();

        // Update user's current room
        user.currentRoom = room._id;
        await user.save();

        // Join socket room
        socket.join(`room:${roomId}`);

        // Populate room data
        await room.populate('players.userId', 'username displayName avatar coins');

        // Notify all players in room about the new player AND send updated player list
        io.to(`room:${roomId}`).emit('player-joined', {
          roomId,
          player: room.players[room.players.length - 1],
          playerCount: room.players.length,
          allPlayers: room.players, // Send full list so everyone stays in sync
          roomCreator: room.createdBy.toString(),
          phase: room.status
        });

        // Auto-start removed - players must click "Chia Bài" button to start
        // if (room.canStart()) {
        //   setTimeout(() => startGame(roomId), 3000);
        // }

        callback({ success: true, room, seat });
      } catch (error) {
        console.error('Join room error:', error);
        callback({ success: false, message: error.message });
      }
    });

    // Leave room
    socket.on('leave-room', async (data, callback) => {
      try {
        const { roomId } = data;
        await leaveRoom(socket.userId, roomId);
        
        socket.leave(`room:${roomId}`);
        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });

    // Rejoin room (for page refresh/F5)
    socket.on('rejoin-room', async (data) => {
      try {
        const { roomId } = data;
        console.log('🔄 [REJOIN] User', socket.user.username, 'attempting to rejoin room:', roomId);
        
        const room = await Room.findById(roomId);

        if (!room) {
          console.log(`❌ [REJOIN] Room ${roomId} not found`);
          socket.emit('rejoin-failed', { 
            success: false, 
            message: 'Room not found' 
          });
          return;
        }

        // Check if user is already in the room's player list
        const isInRoom = room.players.some(p => p.userId.toString() === socket.userId);
        
        console.log('🔄 [REJOIN] User in room player list:', isInRoom);
        
        if (isInRoom) {
          // Just rejoin the socket room for real-time updates
          socket.join(`room:${roomId}`);
          console.log(`✅ [REJOIN] User ${socket.user.username} rejoined room ${roomId}`);
          
          // Populate and send current room state
          await room.populate('players.userId', 'username displayName avatar coins');
          
          // If game is in progress, send full game state with private cards
          const game = activeGames.get(roomId);
          if (game) {
            console.log('🎮 [REJOIN] Game in progress, sending private state');
            
            // Send private state to rejoining player (includes their cards)
            const privateState = game.getPrivateState(socket.userId);
            
            console.log('🎮 [REJOIN] Private state:', {
              hasMyCards: !!privateState.myCards,
              myCardsLength: privateState.myCards?.length,
              phase: privateState.phase,
              currentTurn: privateState.currentTurn,
              pot: privateState.pot
            });
            
            // Send game state with all necessary info
            socket.emit('game-state-update', {
              ...privateState,
              // Add timer information if it's player's turn
              timer: privateState.currentTurn === room.players.find(p => 
                p.userId.toString() === socket.userId
              )?.seat ? 30 : 0, // Reset timer display
              isRejoining: true // Flag to indicate this is a rejoin
            });
            
            console.log('✅ [REJOIN] Game state sent with', privateState.myCards?.length || 0, 'cards');
          } else {
            console.log('🔄 [REJOIN] No active game, room in waiting state');
          }
          
          // Notify the user that they've successfully rejoined
          socket.emit('rejoined-room', {
            success: true,
            room,
            message: 'Đã kết nối lại phòng',
            hasActiveGame: !!activeGames.get(roomId)
          });
          
          console.log('✅ [REJOIN] Complete - User successfully rejoined');
        } else {
          console.log(`❌ [REJOIN] User ${socket.user.username} not in room ${roomId} player list`);
          socket.emit('rejoin-failed', { 
            success: false, 
            message: 'You are not in this room' 
          });
        }
      } catch (error) {
        console.error('❌ [REJOIN] Error:', error);
      }
    });

    // ==================== GAME EVENTS ====================

    // Start game (manual trigger by room creator)
    socket.on('start-game', async (data, callback) => {
      try {
        const { roomId } = data;
        const room = await Room.findById(roomId);

        if (!room) {
          if (callback) callback({ success: false, message: 'Room not found' });
          return;
        }

        // Check if user is the room creator
        if (room.createdBy.toString() !== socket.userId) {
          if (callback) callback({ success: false, message: 'Only room creator can start the game' });
          return;
        }

        // Check if enough players
        if (room.players.length < 2) {
          if (callback) callback({ success: false, message: 'Need at least 2 players to start' });
          return;
        }

        // Start the game
        await startGame(roomId);
        
        if (callback) callback({ success: true, message: 'Game started!' });
      } catch (error) {
        console.error('Start game error:', error);
        if (callback) callback({ success: false, message: error.message });
      }
    });

    // New game - reset room state
    socket.on('new-game', async (data, callback) => {
      try {
        const { roomId } = data;
        const room = await Room.findById(roomId);

        if (!room) {
          if (callback) callback({ success: false, message: 'Room not found' });
          return;
        }

        // Check if user is the room creator
        if (room.createdBy.toString() !== socket.userId) {
          if (callback) callback({ success: false, message: 'Only room creator can start new game' });
          return;
        }

        // Remove active game
        activeGames.delete(roomId);
        
        // Reset room status to waiting
        room.status = 'waiting';
        await room.save();

        // Notify all players to reset UI
        io.to(`room:${roomId}`).emit('game-reset', {
          message: 'Chờ chủ phòng chia bài...'
        });
        
        if (callback) callback({ success: true });
      } catch (error) {
        console.error('New game error:', error);
        if (callback) callback({ success: false, message: error.message });
      }
    });

    // Player action (fold, check, call, bet, raise, all-in)
    socket.on('player-action', async (data, callback) => {
      try {
        console.log('🎮 ===== PLAYER ACTION RECEIVED =====');
        console.log('🎮 User:', socket.user.username, '(', socket.userId, ')');
        console.log('🎮 Data:', data);
        
        const { roomId, action, amount } = data;
        const game = activeGames.get(roomId);

        console.log('🎮 Active games:', Array.from(activeGames.keys()));
        console.log('🎮 Game found:', !!game);

        if (!game) {
          console.log('❌ Game not found for roomId:', roomId);
          if (callback) return callback({ success: false, message: 'Game not found' });
          return;
        }

        console.log('🎮 Calling handlePlayerAction...');
        const result = await game.handlePlayerAction(socket.userId, action, amount);
        console.log('🎮 Action result:', result);

        if (result.success) {
          // Broadcast action to all players
          io.to(`room:${roomId}`).emit('action-performed', {
            userId: socket.userId,
            action,
            amount,
            gameState: game.getPublicState()
          });

          // Check if round/game ended
          if (result.roundEnded) {
            io.to(`room:${roomId}`).emit('round-ended', result.roundData);
          }

          // Note: game-ended is emitted by XiToGame.handlePlayerAction() directly
          // with full allPlayers data, so we don't emit it again here
          if (result.gameEnded) {
            activeGames.delete(roomId);
          }
        }

        if (callback) callback(result);
      } catch (error) {
        console.error('❌ Player action error:', error);
        console.error('❌ Stack:', error.stack);
        if (callback) callback({ success: false, message: error.message });
      }
    });

    // Chat message
    socket.on('chat-message', async (data) => {
      const { roomId, message } = data;
      
      io.to(`room:${roomId}`).emit('chat-message', {
        userId: socket.userId,
        username: socket.user.username,
        message,
        timestamp: new Date()
      });
    });

    // ==================== DISCONNECT ====================

    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.user.username}`);

      // Update user online status
      await User.findByIdAndUpdate(socket.userId, { 
        isOnline: false,
        socketId: null
      });

      // Remove from current room if any
      const user = await User.findById(socket.userId);
      if (user.currentRoom) {
        await leaveRoom(socket.userId, user.currentRoom.toString());
      }

      // Emit online users count
      io.emit('online-users', await User.countDocuments({ isOnline: true }));
    });
  });

  // ==================== HELPER FUNCTIONS ====================

  async function startGame(roomId) {
    try {
      console.log('🎮 ===== STARTING GAME =====');
      console.log('🎮 Room ID:', roomId);
      
      // Check if game is already running
      if (activeGames.has(roomId)) {
        console.log('⚠️ Game already running for this room, skipping start');
        return;
      }
      
      const room = await Room.findById(roomId)
        .populate('players.userId', 'username displayName avatar coins');

      if (!room) {
        console.log('❌ Room not found');
        return;
      }

      console.log('🎮 Room found:', !!room);
      console.log('🎮 Room status:', room.status);
      console.log('🎮 Players count:', room.players.length);
      console.log('🎮 Min players:', room.minPlayers);
      console.log('🎮 Max players:', room.maxPlayers);
      
      // Force reset status to waiting if it's finished (allow restart)
      if (room.status === 'finished') {
        console.log('🔄 Resetting room status from finished to waiting');
        room.status = 'waiting';
        await room.save();
      }
      
      // Ensure minPlayers is set (default to 2 if not set)
      if (!room.minPlayers) {
        console.log('⚠️ minPlayers not set, defaulting to 2');
        room.minPlayers = 2;
        await room.save();
      }
      
      console.log('🎮 Can start:', room.canStart());
      console.log('🎮 Game type:', room.gameType);
      
      if (!room.canStart()) {
        console.log('❌ Cannot start game - conditions not met');
        console.log('   - Status is waiting?', room.status === 'waiting');
        console.log('   - Enough players?', room.players.length >= room.minPlayers);
        return;
      }

      let game;
      if (room.gameType === 'poker') {
        game = new PokerGame(room, io);
      } else if (room.gameType === 'xito') {
        game = new XiToGame(room, io);
      }

      activeGames.set(roomId, game);
      console.log('🎮 Game instance created and stored');
      console.log('🎮 Active games:', Array.from(activeGames.keys()));
      
      await game.start();

      // Also emit game-started event for UI update
      io.to(`room:${roomId}`).emit('game-started', {
        success: true
      });
      console.log('✅ Emitted game-started event');
      
      // Wait a bit for clients to process game-started, then broadcast private state
      setTimeout(() => {
        try {
          console.log('📤 Broadcasting game state to all players...');
          game.broadcastGameState();
          console.log('🎮 Game started and state broadcasted successfully');
        } catch (err) {
          console.error('❌ Error broadcasting game state:', err);
        }
      }, 200);
      
    } catch (error) {
      console.error('Start game error:', error);
    }
  }

  async function leaveRoom(userId, roomId) {
    try {
      const room = await Room.findById(roomId);
      if (!room) return;

      // Check if player is in active game
      if (room.status === 'playing') {
        const game = activeGames.get(roomId);
        if (game) {
          await game.playerFold(userId);
        }
      }

      // Remove player
      room.players = room.players.filter(p => p.userId.toString() !== userId);

      if (room.players.length === 0) {
        await Room.findByIdAndDelete(roomId);
        activeGames.delete(roomId);
      } else {
        await room.save();
      }

      // Update user
      await User.findByIdAndUpdate(userId, { currentRoom: null });

      // Notify remaining players
      io.to(`room:${roomId}`).emit('player-left', {
        userId,
        playerCount: room.players.length
      });
    } catch (error) {
      console.error('Leave room error:', error);
    }
  }
};
