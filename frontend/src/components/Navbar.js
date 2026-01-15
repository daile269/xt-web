import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI, userAPI, roomAPI } from '../services/api';
import { toast } from 'react-toastify';
import socketService from '../services/socket';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      socketService.disconnect();
      logout();
      navigate('/login');
      toast.success('Đăng xuất thành công');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleClaimDailyBonus = async () => {
    try {
      const response = await userAPI.claimDailyBonus();
      if (response.data.success) {
        updateUser({ coins: response.data.coins });
        toast.success(`🎁 Nhận quà hàng ngày thành công!`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể nhận quà');
    }
  };

  const handleLobbyClick = (e) => {
    // Check if currently in a game room
    if (location.pathname.startsWith('/room/')) {
      e.preventDefault();
      setShowLeaveModal(true);
    }
    setIsMobileMenuOpen(false);
  };

  const handleMenuItemClick = () => {
    setIsMobileMenuOpen(false);
  };

  const confirmLeaveRoom = async () => {
    try {
      // Extract roomId from current path
      const roomId = location.pathname.split('/room/')[1];
      if (roomId) {
        await roomAPI.leaveRoom(roomId);
        socketService.emit('leave-room', { roomId });
      }
      setShowLeaveModal(false);
      navigate('/lobby');
      toast.info('Đã rời khỏi phòng');
    } catch (error) {
      console.error('Leave room error:', error);
      toast.error('Không thể rời phòng');
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <Link to={user?.isAdmin ? "/admin" : "/lobby"} className="navbar-logo">
            🎮 {user?.isAdmin ? "Admin Control" : "Poker & Xì Tố"}
          </Link>

          {isMobileMenuOpen && (
            <div className="navbar-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
          )}

          <div className={`navbar-menu ${isMobileMenuOpen ? 'active' : ''}`}>
            <button className="navbar-menu-close" onClick={() => setIsMobileMenuOpen(false)}>
              ✕
            </button>
            
            {!user?.isAdmin && (
              <>
                <Link to="/lobby" className="navbar-item" onClick={handleLobbyClick}>Sảnh Game</Link>
                <Link to="/shop" className="navbar-item" onClick={handleMenuItemClick}>Cửa Hàng</Link>
              </>
            )}
            
            <Link to="/profile" className="navbar-item" onClick={handleMenuItemClick}>Hồ Sơ</Link>
            
            {user?.isAdmin && (
              <Link to="/admin" className="navbar-item admin" onClick={handleMenuItemClick}>Quản Trị</Link>
            )}

            <div className="navbar-user-mobile">
              {!user?.isAdmin && (
                <button onClick={(e) => { handleClaimDailyBonus(); handleMenuItemClick(); }} className="btn btn-gift btn-sm">
                  🎁 Nhận Quà
                </button>
              )}
              <span className="user-name-mobile">{user?.displayName || user?.username} {user?.isAdmin && "(Admin)"}</span>
              <button onClick={(e) => { handleLogout(); handleMenuItemClick(); }} className="btn btn-danger btn-sm">
                Đăng xuất
              </button>
            </div>
          </div>

          <div className="navbar-user">
            {!user?.isAdmin && (
              <div className="user-coins">
                💲 {user?.coins?.toLocaleString() || 0}
              </div>
            )}
            <div className="user-avatar">
              <img src={user?.avatar?.startsWith('http') ? user.avatar : `${process.env.PUBLIC_URL}${user?.avatar || '/avatars/default.png'}`} alt={user?.username} />
            </div>
            <span className="user-name">{user?.displayName || user?.username} {user?.isAdmin && "(Admin)"}</span>
            
            {!user?.isAdmin && (
              <button onClick={handleClaimDailyBonus} className="btn btn-gift btn-sm navbar-gift-btn">
                🎁 Nhận Quà
              </button>
            )}

            <button onClick={handleLogout} className="btn btn-danger btn-sm navbar-logout-btn">
              Đăng xuất
            </button>
          </div>

          <button 
            className={`navbar-hamburger ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Leave Room Confirmation Modal */}
      {showLeaveModal && (
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ Rời Khỏi Phòng?</h2>
            <p>Bạn có chắc chắn muốn rời khỏi phòng không?</p>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowLeaveModal(false)}
              >
                Hủy
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmLeaveRoom}
              >
                Rời Phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
