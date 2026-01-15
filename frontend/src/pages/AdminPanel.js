import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api'; // Dùng service chung
import { toast } from 'react-toastify';
import './AdminPanel.css';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingCoins, setUpdatingCoins] = useState(null); // { userId, amount: 0 }
  const [confirmBan, setConfirmBan] = useState(null); // User object

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers({ page, search })
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data.users);
      setLoading(false);
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu');
      setLoading(false);
    }
  };

  const handleToggleBan = async (userId) => {
    try {
      const res = await adminAPI.banUser(userId, {}); // Sử dụng API đã định nghĩa
      if (res.data.success) {
        toast.success(res.data.message);
        setConfirmBan(null);
        fetchData();
      }
    } catch (error) {
      toast.error('Không thể thực hiện');
    }
  };

  const handleUpdateCoins = async (userId, amount) => {
    if (!amount) return;
    try {
      const res = await adminAPI.adjustCoins(userId, { amount }); // Sử dụng API đã định nghĩa
      if (res.data.success) {
        toast.success('Đã cập nhật tiền');
        setUpdatingCoins(null);
        fetchData();
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật tiền');
    }
  };

  if (loading && !stats) return <div className="admin-loading">Đang tải...</div>;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Quản Trị Hệ Thống</h1>
        <div className="admin-overview">
          <div className="stat-card">
            <h3>Người Dùng</h3>
            <p className="stat-value">{stats?.users.total}</p>
            <span className="stat-detail">Online: {stats?.users.active} | Khóa: {stats?.users.banned}</span>
          </div>
          <div className="stat-card">
            <h3>Tổng Tiền Hệ Thống</h3>
            <p className="stat-value">💲{stats?.coins.totalSystemCoins.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <section className="user-management">
        <div className="section-header">
          <h2>Quản Lý Người Chơi</h2>
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Tìm tên người dùng..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Người chơi</th>
              <th>Tiền</th>
              <th>Trạng thái</th>
              <th>Ngày tham gia</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>
                  <div className="user-info">
                    <img src={user.avatar} alt="" className="admin-avatar" />
                    <div>
                      <div className="username">{user.username}</div>
                      <div className="display-name">{user.displayName}</div>
                    </div>
                  </div>
                </td>
                <td>{user.coins.toLocaleString()}</td>
                <td className={user.isBanned ? 'status-banned' : 'status-active'}>
                  {user.isBanned ? 'Bị Khóa' : (user.isOnline ? 'Online' : 'Offline')}
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="actions">
                  <button 
                    className="btn-ban" 
                    onClick={() => setConfirmBan(user)}
                  >
                    {user.isBanned ? 'Mở Khóa' : 'Khóa'}
                  </button>
                  <button 
                    className="btn-add" 
                    onClick={() => setUpdatingCoins({ userId: user._id, type: 'add', amount: 0 })}
                  >
                    + Cộng
                  </button>
                  <button 
                    className="btn-sub" 
                    onClick={() => setUpdatingCoins({ userId: user._id, type: 'sub', amount: 0 })}
                  >
                    - Trừ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {updatingCoins && (
          <div className="admin-modal">
            <div className="modal-content">
              <h3>{updatingCoins.type === 'add' ? '➕ Cộng tiền' : '➖ Trừ tiền'}</h3>
              <p>Nhập số tiền muốn {updatingCoins.type === 'add' ? 'cộng' : 'trừ'}:</p>
              <input 
                type="number" 
                placeholder="Ví dụ: 100000"
                autoFocus
                onChange={(e) => setUpdatingCoins({ ...updatingCoins, amount: Math.abs(parseInt(e.target.value)) })}
              />
              <div className="modal-btns">
                <button onClick={() => handleUpdateCoins(
                  updatingCoins.userId, 
                  updatingCoins.type === 'add' ? updatingCoins.amount : -updatingCoins.amount
                )}>
                  Xác nhận
                </button>
                <button className="btn-cancel" onClick={() => setUpdatingCoins(null)}>Hủy</button>
              </div>
            </div>
          </div>
        )}

        {confirmBan && (
          <div className="admin-modal">
            <div className="modal-content">
              <h3>{confirmBan.isBanned ? '🔓 Xác nhận mở khóa' : '🔒 Xác nhận khóa tài khoản'}</h3>
              <p>Bạn có chắc chắn muốn {confirmBan.isBanned ? 'mở khóa' : 'khóa'} tài khoản <strong>{confirmBan.username}</strong>?</p>
              <div className="modal-btns">
                <button 
                  className={confirmBan.isBanned ? 'btn-confirm-success' : 'btn-confirm-danger'}
                  onClick={() => handleToggleBan(confirmBan._id)}
                >
                  Xác nhận
                </button>
                <button className="btn-cancel" onClick={() => setConfirmBan(null)}>Hủy</button>
              </div>
            </div>
          </div>
        )}

      </section>
    </div>
  );
};

export default AdminPanel;
