import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { userAPI } from '../services/api';
import { toast } from 'react-toastify';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    fullName: user?.fullName || '',
    dateOfBirth: user?.dateOfBirth || '',
    phoneNumber: user?.phoneNumber || '',
    bankAccount: {
      bankName: user?.bankAccount?.bankName || '',
      accountNumber: user?.bankAccount?.accountNumber || '',
      accountHolder: user?.bankAccount?.accountHolder || ''
    }
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await userAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await userAPI.updateProfile(formData);
      updateUser(formData);
      setIsEditing(false);
      toast.success('Cập nhật thông tin thành công!');
    } catch (error) {
      toast.error('Cập nhật thất bại');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleClaimDailyBonus = async () => {
    try {
      const response = await userAPI.claimDailyBonus();
      toast.success(response.data.message);
      updateUser({ coins: response.data.coins });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể nhận quà');
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          <img src={user?.avatar?.startsWith('http') ? user.avatar : `${process.env.PUBLIC_URL}${user?.avatar || '/avatars/default.png'}`} alt={user?.username} />
        </div>
        <div className="profile-info">
          <h1>{user?.displayName || user?.username}</h1>
          <p className="username">@{user?.username}</p>
          <div className="profile-coins">
            💲 {user?.coins?.toLocaleString()} coins
          </div>
        </div>
      </div>

      <div className="profile-actions">     
        <button onClick={() => setIsEditing(!isEditing)} className="btn btn-primary">
          {isEditing ? '❌ Hủy' : '✏️ Chỉnh sửa'}
        </button>
      </div>

      <div className="profile-content">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="profile-form card">
            <h2>Chỉnh sửa thông tin</h2>
            
            <div className="form-group">
              <label>Tên hiển thị</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Họ và tên</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Ngày sinh</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Số điện thoại</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="form-input"
              />
            </div>

            <h3>Thông tin ngân hàng</h3>

            <div className="form-group">
              <label>Tên ngân hàng</label>
              <input
                type="text"
                value={formData.bankAccount.bankName}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  bankAccount: { ...formData.bankAccount, bankName: e.target.value }
                })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Số tài khoản</label>
              <input
                type="text"
                value={formData.bankAccount.accountNumber}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  bankAccount: { ...formData.bankAccount, accountNumber: e.target.value }
                })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Chủ tài khoản</label>
              <input
                type="text"
                value={formData.bankAccount.accountHolder}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  bankAccount: { ...formData.bankAccount, accountHolder: e.target.value }
                })}
                className="form-input"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              💾 Lưu thay đổi
            </button>
          </form>
        ) : (
          <div className="profile-details">
            <div className="card">
              <h2>📋 Thông tin cá nhân</h2>
              <div className="detail-row">
                <span>Họ và tên:</span>
                <strong>{user?.fullName || 'Chưa cập nhật'}</strong>
              </div>
              <div className="detail-row">
                <span>Ngày sinh:</span>
                <strong>{user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</strong>
              </div>
              <div className="detail-row">
                <span>Số điện thoại:</span>
                <strong>{user?.phoneNumber || 'Chưa cập nhật'}</strong>
              </div>
              <div className="detail-row">
                <span>Email:</span>
                <strong>{user?.email || 'Chưa cập nhật'}</strong>
              </div>
            </div>

            <div className="card">
              <h2>🏦 Thông tin ngân hàng</h2>
              <div className="detail-row">
                <span>Ngân hàng:</span>
                <strong>{user?.bankAccount?.bankName || 'Chưa cập nhật'}</strong>
              </div>
              <div className="detail-row">
                <span>Số tài khoản:</span>
                <strong>{user?.bankAccount?.accountNumber || 'Chưa cập nhật'}</strong>
              </div>
              <div className="detail-row">
                <span>Chủ TK:</span>
                <strong>{user?.bankAccount?.accountHolder || 'Chưa cập nhật'}</strong>
              </div>
            </div>

            {stats && (
              <div className="card">
                <h2>📊 Thống kê game</h2>
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-value">{stats.pokerGamesPlayed}</div>
                    <div className="stat-label">Trận Poker</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{stats.pokerGamesWon}</div>
                    <div className="stat-label">Thắng Poker</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{stats.xitoGamesPlayed}</div>
                    <div className="stat-label">Trận Xì Tố</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{stats.xitoGamesWon}</div>
                    <div className="stat-label">Thắng Xì Tố</div>
                  </div>
                  <div className="stat-box success">
                    <div className="stat-value">{stats.totalWinnings?.toLocaleString()}</div>
                    <div className="stat-label">Tổng Thắng</div>
                  </div>
                  <div className="stat-box danger">
                    <div className="stat-value">{stats.totalLosses?.toLocaleString()}</div>
                    <div className="stat-label">Tổng Thua</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
