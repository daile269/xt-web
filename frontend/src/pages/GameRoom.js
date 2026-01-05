import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import socketService from '../services/socket';
import { useAuthStore } from '../store/authStore';
import './GameRoom.css';
import './GameRoomActions.css';

// Helper to resolve avatar URL
const getAvatarUrl = (avatar) => {
  if (!avatar) return `${process.env.PUBLIC_URL}/avatars/default.png`;
  if (avatar.startsWith('http')) return avatar;
  return `${process.env.PUBLIC_URL}${avatar}`;
};

const GameRoom = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  const { user, token } = useAuthStore();
  
  const [gameState, setGameState] = useState({
    players: [],
    currentPlayer: null,
    pot: { total: 5000, follow: 0 },
    deck: [],
    phase: 'waiting', // waiting, playing, showdown
    timer: 30,
    myPosition: 0,
    roomCreator: null, // ID của người tạo phòng
  });

  const [minBet] = useState(100);
  const [maxBet] = useState(1000);
  const [gameEndData, setGameEndData] = useState(null); // For winner modal
  const [showdownData, setShowdownData] = useState(null); // For showdown results
  const [gameStarting, setGameStarting] = useState(false); // Prevent double-click
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false); // Leave room confirmation

  // Socket connection and room data loading - unified to prevent timing issues
  useEffect(() => {
    // STEP 1: Connect socket and register listeners FIRST
    const socket = socketService.connect(token);
    
    socket.on('game-started', (data) => {
      console.log('🎮 [FE] game-started received!', data);
      toast.success('🎮 Game bắt đầu!');
      // Cards will come via game-state-update event
    });
    
    socket.on('game-state-update', (data) => {
      console.log('🎮 [FE] game-state-update received!', {
        hasMyCards: !!data.myCards,
        myCardsLength: data.myCards?.length,
        phase: data.phase
      });
      handleGameStateUpdate(data);
    });
    
    socket.on('game-ended', (data) => {
      handleGameEnded(data);
    });
    
    socket.on('game-reset', (data) => {
      handleGameReset(data);
    });
    
    socket.on('player-action', (data) => {
      handlePlayerAction(data);
    });
    
    socket.on('game-end', (data) => {
      handleGameEnd(data);
    });
    
    socket.on('player-joined', (data) => {
      handlePlayerJoined(data);
    });
    
    socket.on('player-left', (data) => {
      handlePlayerLeft(data);
    });
    
    socket.on('new-round', (data) => {
      handleNewRound(data);
    });
    
    socket.on('showdown', (data) => {
      handleShowdown(data);
    });
    
    socket.on('rejoined-room', (data) => {
      console.log('✅ [FE] Rejoined room successfully:', data);
      // Chỉ hiện toast nếu đây là rejoin thực sự với game đang chơi
      if (data.success && data.hasActiveGame) {
        toast.success('🎮 Đã kết nối lại game đang chơi');
      } else if (data.success) {
        console.log('👋 [FE] Joined room (waiting for game to start)');
      }
    });
    
    socket.on('rejoin-failed', (data) => {
      console.error('❌ [FE] Rejoin failed:', data);
      toast.error(data.message || 'Không thể kết nối lại phòng');
      // Redirect to lobby after 2 seconds
      setTimeout(() => {
        navigate('/lobby');
      }, 2000);
    });

    // STEP 2: Load room data AFTER listeners are registered
    let isInitialLoad = true;
    let isFirstVisit = !sessionStorage.getItem(`visited-room-${roomId}`);
    
    const loadRoomData = async () => {
      try {
        // First, check if we have room data from navigation state
        const initialRoomData = location.state?.roomData;
        if (initialRoomData) {
          console.log('✅ [FE] Using room data from navigation state:', initialRoomData);
          setGameState(prev => ({
            ...prev,
            players: initialRoomData.players || [],
            pot: { total: initialRoomData.pot || 0, follow: initialRoomData.currentBet || 0 },
            phase: initialRoomData.status || 'waiting',
            roomCreator: initialRoomData.createdBy?._id || initialRoomData.createdBy
          }));
          
          // Clear state to prevent reuse on refresh
          window.history.replaceState({}, document.title);
        } else {
          // Fallback to API fetch
          console.log('📡 [FE] Fetching room data from API');
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/room/${roomId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')).state.token : ''}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.room) {
              setGameState(prev => ({
                ...prev,
                players: data.room.players || [],
                pot: { total: data.room.pot || 0, follow: data.room.currentBet || 0 },
                phase: data.room.status || 'waiting',
                roomCreator: data.room.createdBy?._id || data.room.createdBy
              }));
            }
          }
        }
        
        // Mark this room as visited
        sessionStorage.setItem(`visited-room-${roomId}`, 'true');
        
        // Rejoin socket room ONLY on initial load AND if not first visit (means F5/refresh)
        if (isInitialLoad && !isFirstVisit) {
          const checkSocketAndRejoin = () => {
            if (socket && socket.connected) {
              console.log('🔄 [FE] Rejoining room after F5/refresh');
              socketService.emit('rejoin-room', { roomId });
              isInitialLoad = false;
            } else {
              setTimeout(checkSocketAndRejoin, 200);
            }
          };
          setTimeout(checkSocketAndRejoin, 300);
        } else if (isInitialLoad) {
          // First time visiting - no need to emit rejoin, server handles join via API
          console.log('👋 [FE] First time joining room - skipping rejoin-room event');
          isInitialLoad = false;
        }
      } catch (error) {
        console.error('Failed to load room data:', error);
      }
    };

    loadRoomData();

    return () => {
      socket.offAny();
      socket.off('game-started');
      socket.off('game-state-update');
      socket.off('game-ended');
      socket.off('game-reset');
      socket.off('player-action');
      socket.off('game-end');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('new-round');
      socket.off('showdown');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Timer countdown
  useEffect(() => {
    if (gameState.phase === 'playing' && gameState.timer > 0) {
      const interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timer: prev.timer - 1
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameState.phase, gameState.timer]);

  const handleGameStateUpdate = (data) => {
    console.log('🎮 [FE] game-state-update received!', {
      hasMyCards: !!data.myCards,
      myCardsLength: data.myCards?.length,
      phase: data.phase,
      isRejoining: data.isRejoining
    });
    
    // Create a modified data object with myCards properly merged
    const updatedData = { ...data };
    
    // Reset gameStarting when game actually starts
    if (data.phase === 'playing') {
      setGameStarting(false);
    }
    
    // Handle rejoining scenario - reset timer
    if (data.isRejoining && data.timer) {
      console.log('🔄 [FE] Rejoining - resetting timer to', data.timer);
      updatedData.timer = data.timer;
    }
    
    // If we have myCards, ensure they're in the correct player object
    if (data.myCards && data.myCards.length > 0 && data.players) {
      // Create a new players array with myCards merged
      updatedData.players = data.players.map(p => {
        const pId = p.userId?._id || p.userId;
        const pIdStr = pId?.toString ? pId.toString() : String(pId);
        const userIdStr = user?.id?.toString ? user.id.toString() : String(user?.id);
        const isMatch = pIdStr === userIdStr;
        const isMe = p.isMe || isMatch;
        
        console.log('🔍 [FE] Checking player:', {
          username: p.userId?.username,
          pIdStr,
          userIdStr,
          isMatch,
          isMe
        });
        
        if (isMe) {
          console.log('✅ [FE] Found my player, adding cards:', data.myCards);
          return {
            ...p,
            cards: data.myCards,
            isMe: true
          };
        }
        
        return p;
      });
    }
    
    // Show toast if rejoining with cards
    if (data.isRejoining && data.myCards && data.myCards.length > 0) {
      toast.info(`Đã tải lại game - Bạn có ${data.myCards.length} lá bài`);
    }
    
    setGameState(prev => ({
      ...prev,
      ...updatedData
    }));
  };

  const handlePlayerAction = (data) => {
    console.log('👤 Player action received:', data);
    
    if (!data.action) {
      console.warn('⚠️ Received player action without action field:', data);
      return;
    }
    
    // Don't show toast for our own actions
    if (data.userId === user?.id) return;
    
    const actionText = {
      'fold': 'bỏ bài',
      'check': 'xem',
      'call': 'theo',
      'bet': 'cược',
      'raise': 'tăng'
    }[data.action] || data.action;
    
    toast.info(`${data.playerName || 'Người chơi'} đã ${actionText}`);
  };

  const handleGameEnd = (data) => {
    console.log('🏆 [OLD] Game end event:', data);
    // Redirect to new handler
    handleGameEnded(data);
  };

  const handlePlayerJoined = async (data) => {
    console.log('👤 [FE] Player joined event:', data);
    
    // If backend sends full player list, use it for consistency
    if (data.allPlayers && Array.isArray(data.allPlayers)) {
      console.log('✅ [FE] Updating with full player list from server');
      setGameState(prev => ({
        ...prev,
        players: data.allPlayers,
        roomCreator: data.roomCreator || prev.roomCreator,
        phase: data.phase || prev.phase
      }));
      
      // Show toast if it's not the current user
      const joinedUserId = data.player?.userId?._id || data.player?.userId;
      if (joinedUserId?.toString() !== user?.id?.toString()) {
        toast.info(`${data.player?.userId?.displayName || 'Người chơi'} đã vào phòng`);
      }
      return;
    }
    
    // Fallback: Add single player (old behavior)
    const joinedUserId = data.player?.userId?._id || data.player?.userId;
    if (joinedUserId?.toString() === user?.id?.toString()) {
      console.log('⏭️ [FE] Skipping player-joined for self');
      return;
    }
    
    toast.info(`${data.player?.userId?.displayName || 'Người chơi'} đã vào phòng`);
    
    setGameState(prev => {
      const existingPlayer = prev.players.find(p => {
        const pId = p.userId?._id || p.userId;
        const newId = data.player?.userId?._id || data.player?.userId;
        return pId?.toString() === newId?.toString();
      });
      
      if (existingPlayer) {
        console.log('⚠️ [FE] Player already in list, skipping');
        return prev;
      }
      
      console.log('✅ [FE] Adding new player to state:', data.player);
      return {
        ...prev,
        players: [...prev.players, data.player]
      };
    });
  };

  const handlePlayerLeft = async (data) => {
    console.log('👋 [FE] Player left event:', data);
    
    // Don't show toast if it's the current user (they're probably just refreshing)
    if (data.userId !== user?.id) {
      toast.info(`${data.playerName || 'Người chơi'} đã rời phòng`);
    }
    
    // Update state directly from event data
    setGameState(prev => {
      const updatedPlayers = prev.players.filter(p => {
        const pId = p.userId?._id || p.userId;
        const leftId = data.userId;
        return pId?.toString() !== leftId?.toString();
      });
      
      console.log('✅ [FE] Player removed from state. Players count:', prev.players.length, '→', updatedPlayers.length);
      
      return {
        ...prev,
        players: updatedPlayers
      };
    });
  };

  const handleNewRound = (data) => {
    console.log('🎲 New round started:', data);
    const roundNames = ['', 'Vòng 1 (3 lá)', 'Vòng 2 (4 lá)', 'Vòng 3 (5 lá)', 'Vòng 4 (6 lá)', 'Vòng 5 (7 lá)'];
    toast.info(`${roundNames[data.roundNumber]} - Chia bài!`);
  };

  const handleShowdown = (data) => {
    console.log('🏆 Showdown results:', data);
    setShowdownData(data);
    
    // Also show toast for winner
    if (data.winners && data.winners.length > 0) {
      const winner = data.winners[0];
      toast.success(`Người thắng: ${winner.handRank}!`);
    }
  };

  const handleGameEnded = (data) => {
    console.log('🎮 [FE] handleGameEnded received:', data);
    console.log('🎮 [FE] allPlayers:', data.allPlayers);
    console.log('🎮 [FE] winner:', data.winner);
    setGameEndData(data);
    const winnerName = data?.winner?.username || data?.winner?.displayName || 'Người chơi';
    toast.success(`${winnerName} thắng!`);
  };

  const handleGameReset = (data) => {
    console.log('🔄 Game reset:', data);
    setGameEndData(null);
    setShowdownData(null);
    setGameState(prev => ({
      ...prev,
      phase: 'waiting',
      pot: { total: 0, follow: 0 },
      timer: 30
    }));
    toast.info(data.message || 'Chờ chủ phòng chia bài...');
  };

  const handleStartNewGame = async () => {
    try {
      socketService.emit('new-game', { roomId }, (response) => {
        if (response.success) {
          console.log('✅ New game started');
        } else {
          toast.error(response.message);
        }
      });
    } catch (error) {
      console.error('Error starting new game:', error);
      toast.error('Không thể bắt đầu ván mới');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleRestartGame = () => {
    console.log('🔄 Restarting game...');
    setShowdownData(null);
    setGameEndData(null);
    
    // Reset game state
    setGameState(prev => ({
      ...prev,
      phase: 'waiting',
      players: prev.players.map(p => ({
        ...p,
        cards: [],
        visibleCards: [],
        action: 'waiting',
        bet: 0,
        totalBet: 0,
        isFolded: false
      }))
    }));
    
    // Emit start-game if user is room creator
    if (gameState.roomCreator === user?.id) {
      setTimeout(() => {
        socketService.emit('start-game', { roomId });
        toast.info('Bắt đầu ván mới!');
      }, 500);
    } else {
      toast.info('Đang chờ chủ phòng bắt đầu ván mới...');
    }
  };

  const handleAction = (action, amount = 0) => {
    console.log(`🎮 Performing action: ${action}`, { amount, roomId });
    
    socketService.emit('player-action', {
      roomId,
      action,
      amount
    }, (response) => {
      console.log('🎮 Server response:', response);
      if (!response || !response.success) {
        toast.error(response?.message || 'Action failed');
      }
    });

  };

  const handleLeaveRoom = () => {
    // Cleanup sessionStorage to allow fresh join next time
    sessionStorage.removeItem(`visited-room-${roomId}`);
    socketService.emit('leaveRoom', { roomId });
    navigate('/lobby');
  };

  const formatChips = (amount) => {
    if (!amount && amount !== 0) return '0';
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(2) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(2) + 'K';
    }
    return amount.toString();
  };

  // Parse card string (e.g., 'AH', 'QD') to card object
  const parseCard = (cardStr) => {
    if (!cardStr || typeof cardStr !== 'string') return null;
    
    const rank = cardStr.slice(0, -1); // All characters except last
    const suitCode = cardStr.slice(-1); // Last character
    
    // Map suit codes to symbols
    const suitMap = {
      'H': '♥', // Hearts (Cơ)
      'D': '♦', // Diamonds (Rô)
      'C': '♣', // Clubs (Tép)
      'S': '♠'  // Spades (Bích)
    };
    
    // Map rank codes to display
    const rankMap = {
      'T': '10',
      'J': 'J',
      'Q': 'Q',
      'K': 'K',
      'A': 'A'
    };
    
    const suit = suitMap[suitCode] || suitCode;
    const displayRank = rankMap[rank] || rank;
    const color = (suitCode === 'H' || suitCode === 'D') ? 'red' : 'black';
    
    return {
      rank: displayRank,
      suit: suit,
      color: color
    };
  };

  const renderCard = (card, index, isBack = false) => {
    if (isBack) {
      return (
        <div key={index} className="playing-card back">
        </div>
      );
    }

    // Parse card if it's a string
    const cardObj = typeof card === 'string' ? parseCard(card) : card;
    
    if (!cardObj) {
      return (
        <div key={index} className="playing-card back">
        </div>
      );
    }

    return (
      <div key={index} className={`playing-card ${cardObj.color}`}>
        <span className="card-rank">{cardObj.rank}</span>
        <span className="card-suit">{cardObj.suit}</span>
        <span className="card-rank-bottom">{cardObj.rank}</span>
      </div>
    );
  };

  const renderEmptySeat = (position) => {
    return (
      <div key={`empty-${position}`} className={`player-seat position-${position}`}>
        <div className="empty-seat">
          + Ghế trống
        </div>
      </div>
    );
  };

  return (
    <div className="game-room">
      {/* Header */}
      <div className="game-header">
        <button className="back-button" onClick={() => setShowLeaveConfirm(true)}>
          ← Mức cược 1.000
        </button>

        <div className="game-logo">
          <div className="logo-badge">
            <div className="logo-suits">
              <span>♠</span>
              <span>♥</span>
              <span>♣</span>
              <span>♦</span>
            </div>
            <div className="logo-text">XÌ TỐ</div>
          </div>
        </div>

        {/* Game Status Indicator */}
        <div className={`game-status-indicator ${gameState.phase}`}>
          {gameState.phase === 'waiting' && (
            <>
              <span className="status-icon">⏳</span>
              <span className="status-text">Chờ người chơi</span>
            </>
          )}
          {gameState.phase === 'playing' && (
            <>
              <span className="status-icon">🎮</span>
              <span className="status-text">Đang chơi</span>
            </>
          )}
          {gameState.phase === 'showdown' && (
            <>
              <span className="status-icon">🏆</span>
              <span className="status-text">Lật bài</span>
            </>
          )}
        </div>

        <button className="settings-button">
          ⚙️
        </button>
      </div>

      {/* Poker Table */}
      <div className="poker-table-container">
        <div className="poker-table">
          <div className="table-felt"></div>

          {/* Center area */}
          <div className="table-center">
            <div className="dealer-deck">
              <div className="dealer-button">D</div>
            </div>

            {(() => {
              // Normalize IDs for comparison
              const roomCreatorId = typeof gameState.roomCreator === 'object' 
                ? gameState.roomCreator?._id?.toString() 
                : gameState.roomCreator?.toString();
              const currentUserId = user?.id?.toString();
              const isCreator = roomCreatorId === currentUserId;
              
              if (gameState.phase === 'waiting' && gameState.players.length >= 2 && isCreator) {
                return (
                  <button 
                    className="start-game-button"
                    onClick={() => {
                      if (!gameStarting) {
                        setGameStarting(true);
                        socketService.emit('start-game', { roomId });
                        setTimeout(() => setGameStarting(false), 3000);
                      }
                    }}
                    disabled={gameStarting}
                  >
                    {gameStarting ? '⏳ Đang chia bài...' : '🎴 Chia Bài'}
                  </button>
                );
              } else if (gameState.phase === 'waiting' && gameState.players.length >= 2) {
                return (
                  <div className="waiting-message">
                    Đang chờ chủ phòng chia bài...
                  </div>
                );
              } else {
                return (
                  <div className="pot-display">
                    <div className="pot-total">Tổng:</div>
                    <div className="pot-value">{formatChips(gameState.pot.total)}</div>
                    <div className="pot-follow">Theo: {gameState.pot.follow}</div>
                  </div>
                );
              }
            })()}
          </div>

          {/* Players */}
          {/* Render all 5 positions with current user always at position 0 */}
          {(() => {
            // Find current user's seat
            const myPlayer = gameState.players.find(p => {
              const userData = p.userId || {};
              return userData._id === user?.id || userData._id?.toString() === user?.id;
            });
            
            const mySeat = myPlayer ? myPlayer.seat : 0;
            
            // Calculate relative positions (current user always at position 0)
            return [0, 1, 2, 3, 4].map(relativePosition => {
              // Calculate actual seat number
              const actualSeat = (mySeat + relativePosition) % 5;
              const player = gameState.players.find(p => p.seat === actualSeat);
              
              if (player) {
                // Render player with relative position for CSS
                const isCurrentPlayer = player.userId?._id === gameState.currentPlayer;
                const userData = player.userId || {};
                
                // Properly compare user IDs (handle both object and string)
                const playerUserId = userData._id?.toString ? userData._id.toString() : userData._id;
                const currentUserId = user?.id?.toString ? user.id.toString() : user?.id;
                const isMyPlayer = playerUserId === currentUserId;
                
                // Debug log to check player identification
                console.log(`🎮 [RENDER] Player ${userData.username} at seat ${actualSeat}:`, {
                  playerUserId,
                  currentUserId,
                  isMyPlayer,
                  hasCards: !!player.cards,
                  cardCount: player.cards?.length,
                  visibleCardCount: player.visibleCards?.length
                });

                return (
                  <div key={player._id || player.userId?._id} className={`player-seat position-${relativePosition}`}>
                    {isCurrentPlayer && (
                      <div className={`turn-timer ${gameState.timer <= 10 ? 'warning' : ''}`}>
                        {gameState.timer}
                      </div>
                    )}
                    
                    <div className="player-container">
                      <div className={`player-info ${!player.isFolded ? 'active' : ''}`}>
                        <img 
                          src={getAvatarUrl(userData.avatar)} 
                          alt={userData.displayName || userData.username} 
                          className="player-avatar"
                        />
                        <div className="player-details">
                          <div className="player-name">{userData.displayName || userData.username}</div>
                          <div className="player-chips">
                            💲{formatChips(player.coins || 0)}
                          </div>
                        </div>
                        {player.action && player.action !== 'waiting' && (
                          <div className={`player-status ${player.action.toLowerCase().replace(' ', '-')}`}>
                            {player.action}
                          </div>
                        )}
                      </div>

                      <div className="player-cards">
                        {(() => {
                          // For current player: show all cards (both hidden and visible)
                          // This includes the initial 3 face-down cards in round 1
                          if (isMyPlayer && player.cards && player.cards.length > 0) {
                            return player.cards.map((card, index) => renderCard(card, index, false));
                          }
                          
                          // For other players: show visible cards + card backs for hidden cards
                          const visibleCards = player.visibleCards || [];
                          const totalCards = player.cardCount || player.cards?.length || 0;
                          const hiddenCount = totalCards - visibleCards.length;
                          
                          if (totalCards === 0) {
                            // No cards yet, show 2 card backs
                            return (
                              <>
                                {renderCard(null, 0, true)}
                                {renderCard(null, 1, true)}
                              </>
                            );
                          }
                          
                          // Render hidden cards first (card backs), then visible cards
                          const cards = [];
                          
                          // Hidden cards (in round 1, all 3 cards are hidden for opponents)
                          for (let i = 0; i < hiddenCount; i++) {
                            cards.push(renderCard(null, `hidden-${i}`, true));
                          }
                          
                          // Visible cards
                          visibleCards.forEach((card, index) => {
                            cards.push(renderCard(card, `visible-${index}`, false));
                          });
                          
                          return cards;
                        })()}
                      </div>
                    </div>
                  </div>
                );
              } else {
                return renderEmptySeat(relativePosition);
              }
            });
          })()}
        </div>
      </div>

      {/* Action Panels */}
      {gameState.phase === 'playing' && (
        <div className="action-panels">
          {/* Check if it's current user's turn */}
          {(() => {
            // Find current user's player object
            const myPlayer = gameState.players.find(p => {
              const userData = p.userId || {};
              return userData._id === user?.id || userData._id?.toString() === user?.id;
            });

            // Check if it's my turn
            const isMyTurn = myPlayer && gameState.currentTurn === myPlayer.seat;
            
            // Debug log (commented out to reduce spam - this runs on every render!)
            // console.log('🎯 Turn check:', {
            //   myPlayer: myPlayer ? `${myPlayer.userId?.username || myPlayer.userId?.displayName} (seat ${myPlayer.seat})` : 'not found',
            //   currentTurn: gameState.currentTurn,
            //   isMyTurn,
            //   phase: gameState.phase
            // });

            if (!isMyTurn) {
              // Show waiting message
              return (
                <div className="waiting-turn-message">
                  <span className="waiting-icon">⏳</span>
                  <span className="waiting-text">Đang chờ người chơi khác...</span>
                </div>
              );
            }

            // Show action buttons if it's my turn
            return (
              <>
                {/* Left Panel - Basic Actions */}
                <div className="action-panel-left">
                  <button 
                    className="action-button btn-fold"
                    onClick={() => handleAction('fold')}
                  >
                    <span>Bỏ bài</span>
                  </button>

                  <button 
                    className="action-button btn-check"
                    onClick={() => handleAction('check')}
                    disabled={gameState.currentBet > 0}
                  >
                    <span>Xem</span>
                  </button>

                  <button 
                    className="action-button btn-call"
                    onClick={() => handleAction('call')}
                    disabled={gameState.currentBet === 0}
                  >
                    <span>Theo ({gameState.currentBet || 0})</span>
                  </button>
                </div>

                {/* Right Panel - Betting Actions */}
                <div className="action-panel-right">
                  <button 
                    className="action-button btn-bet"
                    onClick={() => handleAction('bet', gameState.bettingLimits?.min || minBet)}
                  >
                    <span>Cược {formatChips(gameState.bettingLimits?.min || minBet)}</span>
                  </button>

                  <button 
                    className="action-button btn-raise"
                    onClick={() => handleAction('raise', (gameState.currentBet || 0) * 2)}
                    disabled={!gameState.currentBet}
                  >
                    <span>Tăng 2x</span>
                  </button>

                  <button 
                    className="action-button btn-raise"
                    onClick={() => handleAction('raise', gameState.bettingLimits?.max || maxBet)}
                  >
                    <span>Tối đa {formatChips(gameState.bettingLimits?.max || maxBet)}</span>
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Winner Modal - When someone folds */}
      {gameEndData && (
        <div className="game-end-modal-overlay">
          <div className="results-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="results-header">
              <h1 className="results-title">
                <span className="trophy-icon">🏆</span>
                KẾT THÚC VÁN
              </h1>
              <p className="results-subtitle">
                {gameEndData.reason === 'fold' ? '🎯 Chiến thắng do đối thủ bỏ bài' : '🎴 So bài quyết định'}
              </p>
            </div>

            {/* Total Pot */}
            <div className="results-pot-section">
              <div className="pot-info">
                <p className="pot-label">TIỀN THẮNG</p>
                <h2 className="pot-value">
                  {formatChips(gameEndData.winAmount || gameEndData.pot || gameEndData.amount || 0)}
                </h2>
              </div>
              <div className="pot-icon-badge">💰</div>
            </div>

            {/* Players Grid - Show all players */}
            <div className={`results-grid players-${gameEndData.allPlayers?.length || 2}`}>
              {gameEndData.allPlayers && gameEndData.allPlayers.length > 0 ? (
                gameEndData.allPlayers.map((player, index) => {
                  const isWinner = player.username === gameEndData.winner?.username || 
                                   player.userId === gameEndData.winner?.userId;
                  
                  return (
                    <div key={index} className={`player-result-card ${isWinner ? 'is-winner' : ''}`}>
                      {isWinner && (
                        <div className="winner-badge-corner">
                          👑 WINNER
                        </div>
                      )}

                      <div className="player-result-header">
                        <div className={`player-result-avatar ${isWinner ? 'winner-avatar' : ''}`}>
                          <img 
                            src={getAvatarUrl(player.avatar)} 
                            alt={player.username}
                          />
                        </div>
                        <div className="player-result-info">
                          <h3 className="player-result-name">
                            {player.username || 'Người chơi'}
                          </h3>
                          <span className={`player-result-rank ${isWinner ? 'winner-rank' : ''}`}>
                            {player.isFolded ? 'Bỏ bài' : (player.handRank || 'Thắng')}
                          </span>
                        </div>
                      </div>

                      <div className="player-result-cards">
                        {player.cards && player.cards.length > 0 ? (
                          player.cards.map((card, cardIndex) => 
                            renderCard(card, cardIndex, false)
                          )
                        ) : (
                          [0, 1, 2, 3].map((i) => renderCard(null, i, true))
                        )}
                      </div>

                      <div className="player-result-footer">
                        <div className="result-label">TIỀN THẮNG</div>
                        <div className={`result-amount ${isWinner ? 'winner-amount' : ''}`}>
                          {isWinner ? `+${formatChips(gameEndData.winAmount || gameEndData.pot || 0)}` : '0đ'}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Fallback if allPlayers not provided
                <div className="player-result-card is-winner">
                  <div className="winner-badge-corner">👑 WINNER</div>
                  <div className="player-result-header">
                    <div className="player-result-avatar winner-avatar">
                      <img 
                        src={getAvatarUrl(gameEndData.winner?.avatar)} 
                        alt={gameEndData.winner?.username}
                      />
                    </div>
                    <div className="player-result-info">
                      <h3 className="player-result-name">
                        {gameEndData.winner?.username || 'Người chơi'}
                      </h3>
                      <span className="player-result-rank winner-rank">
                        {gameEndData.winner?.handRank || 'Thắng'}
                      </span>
                    </div>
                  </div>
                  <div className="player-result-cards">
                    {gameEndData.winner?.cards?.map((card, cardIndex) => 
                      renderCard(card, cardIndex, false)
                    )}
                  </div>
                  <div className="player-result-footer">
                    <div className="result-label">TIỀN THẮNG</div>
                    <div className="result-amount winner-amount">
                      +{formatChips(gameEndData.winAmount || gameEndData.pot || 0)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="results-actions">
              <button className="results-btn btn-new-game" onClick={handleStartNewGame}>
                🔄 Ván mới
              </button>
              <button className="results-btn btn-leave-room" onClick={() => navigate('/lobby')}>
                🏠 Về sảnh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Showdown Modal - Show all hands */}
      {showdownData && (
        <div className="game-end-modal-overlay">
          <div className="results-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="results-header">
              <h1 className="results-title">
                <span className="trophy-icon">🏆</span>
                KẾT QUẢ VÁN ĐẤU
              </h1>
              <p className="results-subtitle">
                👥 Bàn chơi: {showdownData.allHands?.length || 0} người
              </p>
            </div>

            {/* Total Pot */}
            <div className="results-pot-section">
              <div className="pot-info">
                <p className="pot-label">TỔNG POT</p>
                <h2 className="pot-value">{formatChips(showdownData.pot)}</h2>
              </div>
              <div className="pot-icon-badge">⭐</div>
            </div>

            {/* Players Grid */}
            <div className={`results-grid players-${showdownData.allHands?.length || 0}`}>
              {showdownData.allHands && showdownData.allHands.map((hand, index) => {
                const isWinner = showdownData.winners?.some(w => 
                  (w.userId?._id || w.userId) === (hand.userId?._id || hand.userId)
                );
                const player = gameState.players.find(p => {
                  const pId = p.userId?._id || p.userId;
                  const hId = hand.userId?._id || hand.userId;
                  return pId?.toString() === hId?.toString();
                });
                const userData = player?.userId || {};
                
                return (
                  <div key={index} className={`player-result-card ${isWinner ? 'is-winner' : ''}`}>
                    {isWinner && (
                      <div className="winner-badge-corner">
                        👑 WINNER
                      </div>
                    )}

                    <div className="player-result-header">
                      <div className={`player-result-avatar ${isWinner ? 'winner-avatar' : ''}`}>
                        <img src={getAvatarUrl(userData.avatar)} alt={userData.username} />
                      </div>
                      <div className="player-result-info">
                        <h3 className="player-result-name">{userData.displayName || userData.username}</h3>
                        <span className={`player-result-rank ${isWinner ? 'winner-rank' : ''}`}>
                          {hand.handRank}
                        </span>
                      </div>
                    </div>

                    <div className="player-result-cards">
                      {hand.cards && hand.cards.map((card, cardIndex) => 
                        renderCard(card, cardIndex, false)
                      )}
                    </div>

                    <div className="player-result-footer">
                      <div className="result-label">TIỀN THẮNG</div>
                      <div className={`result-amount ${isWinner ? 'winner-amount' : ''}`}>
                        {isWinner ? `+${formatChips(showdownData.winAmount)}` : '0đ'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="results-actions">
              <button className="results-btn btn-new-game" onClick={handleStartNewGame}>
                🔄 Ván mới
              </button>
              <button className="results-btn btn-leave-room" onClick={() => navigate('/lobby')}>
                🏠 Về sảnh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Room Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="game-end-modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="leave-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="leave-confirm-header">
              <h2>⚠️ Rời phòng?</h2>
            </div>
            <div className="leave-confirm-body">
              <p>Bạn có chắc chắn muốn rời khỏi phòng này không?</p>
              {gameState.phase === 'playing' && (
                <p className="warning-text">⚠️ Game đang diễn ra, bạn sẽ mất tiền cược!</p>
              )}
            </div>
            <div className="leave-confirm-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setShowLeaveConfirm(false)}
              >
                ❌ Hủy
              </button>
              <button 
                className="btn-confirm-leave" 
                onClick={() => {
                  setShowLeaveConfirm(false);
                  handleLeaveRoom();
                }}
              >
                ✅ Rời phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
