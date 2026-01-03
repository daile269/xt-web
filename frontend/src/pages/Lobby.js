import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomAPI, userAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import socketService from '../services/socket';
import { toast } from 'react-toastify';
import './Lobby.css';

const Lobby = () => {
  const [rooms, setRooms] = useState([]);
  const [filter, setFilter] = useState({ gameType: 'all', zone: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user, updateUser, token } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadRooms();
    connectSocket();

    // Auto-refresh every 5 seconds to prevent caching
    const refreshInterval = setInterval(() => {
      loadRooms();
    }, 5000);

    return () => {
      socketService.removeAllListeners('room-created');
      socketService.removeAllListeners('online-users');
      clearInterval(refreshInterval);
    };
  }, []);

  // Reload rooms when filter changes
  useEffect(() => {
    loadRooms();
  }, [filter]);

  const connectSocket = () => {
    socketService.connect(token);

    socketService.on('room-created', (room) => {
      loadRooms(); // Reload instead of adding to prevent duplicates
    });

    socketService.on('online-users', (count) => {
      setOnlineUsers(count);
    });
  };

  const loadRooms = async () => {
    setLoading(true);
    try {
      const response = await roomAPI.getRooms(filter);
      setRooms(response.data.rooms);
    } catch (error) {
      toast.error('Không thể tải danh sách phòng');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      const password = rooms.find(r => r._id === roomId)?.isPrivate 
        ? prompt('Nhập mật khẩu phòng:') 
        : null;

      socketService.joinRoom({ roomId, password }, (response) => {
        if (response.success) {
          // Pass room data to GameRoom to avoid race condition
          navigate(`/room/${roomId}`, { 
            state: { roomData: response.room } 
          });
        } else {
          toast.error(response.message);
        }
      });
    } catch (error) {
      toast.error('Không thể tham gia phòng');
    }
  };

  const handleClaimDailyBonus = async () => {
    try {
      const response = await userAPI.claimDailyBonus();
      toast.success(response.data.message);
      updateUser({ coins: response.data.coins });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể nhận quà');
    }
  };

  const handleAutoRefill = async () => {
    try {
      const response = await userAPI.autoRefill();
      toast.success(response.data.message);
      updateUser({ coins: response.data.coins });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể refill');
    }
  };

  const filteredRooms = rooms.filter((room) => {
    if (filter.gameType !== 'all' && room.gameType !== filter.gameType) return false;
    if (filter.zone !== 'all' && room.zone !== filter.zone) return false;
    if (searchQuery && !room.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <h1>🎮 Sảnh Game</h1>
        <div className="lobby-stats">
          <div className="stat-item">
            <span className="stat-icon">👥</span>
            <span>{onlineUsers} người online</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🎲</span>
            <span>{rooms.length} phòng đang chơi</span>
          </div>
        </div>
      </div>

      <div className="lobby-actions">
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          ➕ Tạo Phòng Mới
        </button>
      </div>

      <div className="lobby-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm phòng theo tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        <select 
          value={filter.gameType} 
          onChange={(e) => setFilter({ ...filter, gameType: e.target.value })}
          className="filter-select"
        >
          <option value="all">Tất cả game</option>
          <option value="poker">Poker</option>
          <option value="xito">Xì Tố</option>
        </select>

        <select 
          value={filter.zone} 
          onChange={(e) => setFilter({ ...filter, zone: e.target.value })}
          className="filter-select"
        >
          <option value="all">Tất cả khu vực</option>
          <option value="bronze">🥉 Bronze (0-5K)</option>
          <option value="silver">🥈 Silver (5K-25K)</option>
          <option value="gold">🥇 Gold (25K-100K)</option>
          <option value="platinum">💎 Platinum (100K+)</option>
        </select>

        <button onClick={loadRooms} className="btn btn-secondary" disabled={loading}>
          {loading ? '⏳ Đang tải...' : '🔄 Làm mới'}
        </button>
      </div>

      <div className="rooms-grid">
        {filteredRooms.length === 0 ? (
          <div className="no-rooms">
            <p>Không có phòng nào. Hãy tạo phòng mới!</p>
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div key={room._id} className="room-card">
              <div className="room-header">
                <h3>{room.name}</h3>
                <span className={`room-status ${room.status}`}>
                  {room.status === 'waiting' ? '⏳ Chờ' : '🎮 Chơi'}
                </span>
              </div>
              
              <div className="room-info">
                <div className="info-row">
                  <span>Game:</span>
                  <strong>{room.gameType === 'poker' ? '🃏 Poker' : '♠️ Xì Tố'}</strong>
                </div>
                <div className="info-row">
                  <span>Khu vực:</span>
                  <strong className={`zone-${room.zone}`}>
                    {room.zone.toUpperCase()}
                  </strong>
                </div>
                <div className="info-row">
                  <span>Người chơi:</span>
                  <strong>{room.players.length}/{room.maxPlayers}</strong>
                </div>
                <div className="info-row">
                  <span>Cược tối thiểu:</span>
                  <strong>{room.minBet.toLocaleString()} coins</strong>
                </div>
              </div>

              <button
                onClick={() => handleJoinRoom(room._id)}
                disabled={room.players.length >= room.maxPlayers}
                className="btn btn-primary btn-block"
              >
                {room.players.length >= room.maxPlayers ? '❌ Đầy' : '🎮 Tham Gia'}
              </button>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(room) => {
            setRooms([room, ...rooms]);
            setShowCreateModal(false);
            // Navigate to the created room with room data
            navigate(`/room/${room._id}`, { 
              state: { roomData: room } 
            });
          }}
        />
      )}
    </div>
  );
};

const CreateRoomModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    gameType: 'poker',
    zone: 'bronze',
    minBet: 100,
    maxBet: 1000,
    isPrivate: false,
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await roomAPI.createRoom(formData);
      if (response.data.success) {
        toast.success(response.data.message);
        onCreate(response.data.room);
      }
    } catch (error) {
      console.error('Create room error:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        toast.error(error.response?.data?.message || 'Không thể tạo phòng');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Tạo Phòng Mới</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên phòng</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nhập tên phòng"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Loại game</label>
            <select
              value={formData.gameType}
              onChange={(e) => setFormData({ ...formData, gameType: e.target.value })}
              className="form-input"
            >
              <option value="poker">🃏 Poker</option>
              <option value="xito">♠️ Xì Tố</option>
            </select>
          </div>

          <div className="form-group">
            <label>Khu vực</label>
            <select
              value={formData.zone}
              onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
              className="form-input"
            >
              <option value="bronze">🥉 Bronze</option>
              <option value="silver">🥈 Silver</option>
              <option value="gold">🥇 Gold</option>
              <option value="platinum">💎 Platinum</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cược tối thiểu</label>
              <input
                type="number"
                value={formData.minBet}
                onChange={(e) => setFormData({ ...formData, minBet: parseInt(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Cược tối đa</label>
              <input
                type="number"
                value={formData.maxBet}
                onChange={(e) => setFormData({ ...formData, maxBet: parseInt(e.target.value) })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isPrivate}
                onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
              />
              Phòng riêng tư (có mật khẩu)
            </label>
          </div>

          {formData.isPrivate && (
            <div className="form-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Nhập mật khẩu phòng"
                className="form-input"
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Đang tạo phòng...' : 'Tạo Phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Lobby;
