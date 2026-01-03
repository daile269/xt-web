import React from 'react';

const AdminPanel = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>👨‍💼 Admin Panel</h1>
      <p>Trang này đang trong quá trình phát triển...</p>
      <p>Sẽ bao gồm:</p>
      <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '2rem auto' }}>
        <li>Dashboard với thống kê tổng quan</li>
        <li>Quản lý người chơi (danh sách, tìm kiếm, ban/unban)</li>
        <li>Cộng/trừ coins cho người chơi</li>
        <li>Quản lý phòng chơi (xem, reset, xóa)</li>
        <li>Quản lý giao dịch (duyệt nạp/rút tiền)</li>
        <li>Xem thông tin ngân hàng của người chơi</li>
        <li>Lịch sử giao dịch</li>
        <li>Thống kê doanh thu</li>
      </ul>
    </div>
  );
};

export default AdminPanel;
