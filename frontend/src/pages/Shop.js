import React from 'react';

const Shop = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🏪 Cửa Hàng</h1>
      <p>Trang này đang trong quá trình phát triển...</p>
      <p>Sẽ bao gồm:</p>
      <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '2rem auto' }}>
        <li>Danh sách vật phẩm (Avatar, Gift, Chip Package)</li>
        <li>Lọc theo loại vật phẩm và rarity</li>
        <li>Mua vật phẩm bằng coins</li>
        <li>Bán vật phẩm từ inventory</li>
        <li>Xem inventory của người chơi</li>
        <li>Giao dịch vật phẩm với người chơi khác</li>
        <li>Yêu cầu nạp tiền thật</li>
        <li>Yêu cầu rút tiền</li>
      </ul>
    </div>
  );
};

export default Shop;
