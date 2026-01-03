# 🎮 Poker & Xì Tố - Web Game Online

Dự án web game Poker & Xì Tố với đầy đủ tính năng realtime sử dụng Node.js, Express, Socket.IO, ReactJS, MongoDB, và Redis.

## 📋 Mục Lục

- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cài đặt](#cài-đặt)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Hướng dẫn sử dụng](#hướng-dẫn-sử-dụng)
- [API Documentation](#api-documentation)

## ✨ Tính Năng

### 👤 Người Chơi (Player Features)

#### 1. Đăng nhập & Đăng ký
- ✅ Đăng nhập bằng tài khoản local (username + password)
- ✅ Đăng nhập bằng Google OAuth 2.0
- ✅ Lưu phiên đăng nhập với JWT
- ✅ Mã hóa mật khẩu với bcrypt

#### 2. Hồ sơ người chơi
- ✅ Xem thông tin cá nhân (avatar, tên, coins)
- ✅ Đổi tên hiển thị
- ✅ Chọn avatar từ thư viện
- ✅ Cập nhật thông tin cá nhân (họ tên, ngày sinh, số điện thoại, tài khoản ngân hàng)
- ✅ Xem thống kê game (số trận thắng/thua, tổng tiền thắng/thua)

#### 3. Hệ thống Coin
- ✅ 10,000 coins mặc định khi tạo tài khoản
- ✅ Nhận coin miễn phí mỗi ngày (Daily Bonus: 1,000 coins)
- ✅ Tự động refill coin khi hết (tối đa 3 lần/ngày, mỗi lần 5,000 coins)
- ✅ Yêu cầu nạp tiền qua admin
- ✅ Yêu cầu rút tiền
- ✅ Lịch sử giao dịch chi tiết

### 🎮 Game Features

#### 4. Lobby & Room Management
- ✅ Hiển thị danh sách phòng chơi
- ✅ Lọc theo game type (Poker/Xì Tố)
- ✅ Lọc theo zone (Bronze/Silver/Gold/Platinum)
- ✅ Tạo phòng mới (public/private với password)
- ✅ Join phòng tự động hoặc chọn phòng
- ✅ Phân chia 4 khu vực theo số tiền:
  - Bronze: 0 - 5,000 coins
  - Silver: 5,000 - 25,000 coins
  - Gold: 25,000 - 100,000 coins
  - Platinum: 100,000+ coins
- ✅ Hiển thị số người chơi trong phòng (2-7 người)
- ✅ Mức cược tối thiểu/tối đa cho mỗi bàn

#### 5. Poker (Texas Hold'em)
- ✅ Chia 2 lá bài tẩy cho mỗi người
- ✅ Chia bài chung: Flop (3) → Turn (1) → River (1)
- ✅ Các hành động: Fold, Check, Call, Bet, Raise, All-in
- ✅ Kiểm soát vòng cược theo quy tắc Texas Hold'em
- ✅ Tự động đánh giá hand rank (High Card → Royal Flush)
- ✅ So bài và trao thắng tự động
- ✅ Trích 5% house rake (2% vào jackpot)
- ✅ Timer cho mỗi lượt (30 giây, auto-fold nếu timeout)
- ✅ Dealer button rotation

#### 6. Xì Tố (Xì Phé 7 Cây)
- ✅ Chia bài theo vòng: 3 → 4 → 5 → 6 → 7 lá
- ✅ Các hành động: Fold, Call, Bet, Raise, All-in
- ✅ Đánh giá hand rank Xì Tố (Mậu Thầu → Sảnh Rồng)
- ✅ Lật bài và xác định người thắng
- ✅ Trích 5% house rake (2% vào jackpot)
- ✅ Ante (tiền cược bắt buộc) mỗi ván

#### 7. Realtime Features
- ✅ Socket.IO cho cập nhật realtime
- ✅ Đồng bộ trạng thái game cho tất cả người chơi
- ✅ Live chat trong phòng
- ✅ Hiển thị action của người chơi ngay lập tức
- ✅ Animation cho chip và card dealing
- ✅ Countdown timer cho turn

### 🏪 Shop & Inventory

#### 8. Cửa hàng
- ✅ Mua avatar, quà tặng, chip packages
- ✅ Bán vật phẩm trong inventory (70% giá gốc)
- ✅ Giao dịch giữa người chơi với nhau
- ✅ Phân loại vật phẩm: Common, Rare, Epic, Legendary
- ✅ Giới hạn số lượng cho vật phẩm đặc biệt

### 👨‍💼 Admin Panel

#### 9. Quản lý người chơi
- ✅ Danh sách tất cả người chơi
- ✅ Tìm kiếm theo tên/email
- ✅ Cộng/trừ coins cho người chơi
- ✅ Ban/Unban người chơi
- ✅ Xem thông tin chi tiết (tên, ngày sinh, SĐT, TK ngân hàng)

#### 10. Quản lý phòng chơi
- ✅ Xem danh sách phòng đang hoạt động
- ✅ Xem số người chơi trong phòng
- ✅ Reset/Xóa phòng

#### 11. Quản lý giao dịch
- ✅ Danh sách yêu cầu nạp/rút tiền
- ✅ Duyệt/Từ chối giao dịch
- ✅ Xem thông tin ngân hàng của người chơi
- ✅ Lọc theo loại giao dịch và trạng thái
- ✅ Ghi chú cho mỗi giao dịch

#### 12. Dashboard & Statistics
- ✅ Tổng số người chơi
- ✅ Số người đang online
- ✅ Số phòng đang hoạt động
- ✅ Tổng coins trong hệ thống
- ✅ Giao dịch trong ngày
- ✅ Giao dịch chờ duyệt

## 🛠 Công Nghệ Sử Dụng

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Realtime communication
- **MongoDB** - Database
- **Mongoose** - ODM
- **Redis** - Caching & session storage
- **JWT** - Authentication
- **Passport.js** - Google OAuth
- **bcryptjs** - Password hashing

### Frontend
- **React.js** - UI framework
- **React Router** - Routing
- **Zustand** - State management
- **Socket.IO Client** - Realtime client
- **Axios** - HTTP client
- **React Toastify** - Notifications
- **Framer Motion** - Animations (optional)

## 📦 Cài Đặt

### Yêu cầu hệ thống
- Node.js >= 16.x
- MongoDB >= 5.x
- Redis >= 6.x

### 1. Clone repository
```bash
cd d:\Document\ProjectWeb\pk-web
```

### 2. Cài đặt Backend

```bash
cd backend
npm install
```

Tạo file `.env` từ `.env.example`:
```bash
copy .env.example .env
```

Cấu hình file `.env`:
```env
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/pk-web
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d

# Google OAuth (nếu dùng)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Session
SESSION_SECRET=your-session-secret

# Frontend
FRONTEND_URL=http://localhost:3000

# Game Config
DEFAULT_COINS=10000
DAILY_BONUS_COINS=1000
AUTO_REFILL_COINS=5000
MAX_REFILL_COUNT=3
HOUSE_RAKE_PERCENTAGE=5
JACKPOT_PERCENTAGE=2
```

### 3. Cài đặt Frontend

```bash
cd ../frontend
npm install
```

### 4. Khởi động MongoDB & Redis

**MongoDB:**
```bash
# Windows
net start MongoDB

# Hoặc chạy mongod.exe
mongod --dbpath "C:\data\db"
```

**Redis:**
```bash
# Windows (dùng WSL hoặc Redis for Windows)
redis-server
```

### 5. Chạy ứng dụng

**Backend:**
```bash
cd backend
npm run dev
```

Backend chạy tại: http://localhost:5000

**Frontend:**
```bash
cd frontend
npm start
```

Frontend chạy tại: http://localhost:3000

## 📁 Cấu Trúc Dự Án

```
pk-web/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js       # MongoDB config
│   │   │   ├── redis.js          # Redis config
│   │   │   └── passport.js       # Passport config
│   │   ├── models/
│   │   │   ├── User.js           # User model
│   │   │   ├── Room.js           # Room model
│   │   │   ├── GameHistory.js    # Game history
│   │   │   ├── Transaction.js    # Transactions
│   │   │   └── Item.js           # Shop items
│   │   ├── routes/
│   │   │   ├── auth.js           # Auth routes
│   │   │   ├── user.js           # User routes
│   │   │   ├── room.js           # Room routes
│   │   │   ├── game.js           # Game routes
│   │   │   ├── shop.js           # Shop routes
│   │   │   ├── transaction.js    # Transaction routes
│   │   │   └── admin.js          # Admin routes
│   │   ├── middleware/
│   │   │   └── auth.js           # Auth middleware
│   │   ├── game/
│   │   │   ├── PokerGame.js      # Poker game logic
│   │   │   └── XiToGame.js       # Xi To game logic
│   │   ├── utils/
│   │   │   ├── pokerHandEvaluator.js
│   │   │   └── xiToHandEvaluator.js
│   │   ├── socket/
│   │   │   └── index.js          # Socket.IO handlers
│   │   └── server.js             # Entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   ├── PrivateRoute.js
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Lobby.js
│   │   │   ├── GameRoom.js
│   │   │   ├── Profile.js
│   │   │   ├── Shop.js
│   │   │   └── AdminPanel.js
│   │   ├── services/
│   │   │   ├── api.js            # API service
│   │   │   └── socket.js         # Socket service
│   │   ├── store/
│   │   │   ├── authStore.js      # Auth state
│   │   │   └── gameStore.js      # Game state
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── .env
│
└── README.md
```

## 🚀 Hướng Dẫn Sử Dụng

### Đăng ký & Đăng nhập
1. Truy cập http://localhost:3000
2. Click "Đăng ký ngay" để tạo tài khoản
3. Nhập username (3-20 ký tự) và password (tối thiểu 6 ký tự)
4. Đăng nhập với tài khoản vừa tạo

### Chơi game
1. Sau khi đăng nhập, bạn sẽ vào Lobby
2. Chọn game type (Poker hoặc Xì Tố)
3. Chọn zone phù hợp với số coins của bạn
4. Click "Tham gia" để vào phòng hoặc "Tạo phòng" để tạo phòng mới
5. Đợi đủ người chơi (tối thiểu 2 người)
6. Game tự động bắt đầu
7. Thực hiện các hành động: Fold, Check, Call, Bet, Raise, All-in

### Nhận coins miễn phí
1. Vào trang Profile
2. Click "Nhận quà hàng ngày" để claim daily bonus (1,000 coins)
3. Khi hết coins, click "Auto Refill" (tối đa 3 lần/ngày, mỗi lần 5,000 coins)

### Mua bán vật phẩm
1. Vào Cửa hàng
2. Chọn vật phẩm muốn mua
3. Click "Mua" và xác nhận
4. Vào Inventory để xem vật phẩm đã mua
5. Click "Bán" để bán vật phẩm (nhận 70% giá gốc)

### Admin Panel
1. Đăng nhập với tài khoản admin (cần set `isAdmin: true` trong database)
2. Vào Admin Panel từ navbar
3. Quản lý người chơi, phòng, giao dịch
4. Duyệt yêu cầu nạp/rút tiền

## 📚 API Documentation

### Authentication

#### POST /api/auth/register
Đăng ký tài khoản mới
```json
{
  "username": "player123",
  "password": "password123"
}
```

#### POST /api/auth/login
Đăng nhập
```json
{
  "username": "player123",
  "password": "password123"
}
```

#### GET /api/auth/google
Đăng nhập bằng Google OAuth

### User

#### GET /api/user/profile
Lấy thông tin người dùng (cần token)

#### PUT /api/user/profile
Cập nhật thông tin (cần token)

#### POST /api/user/daily-bonus
Nhận coin hàng ngày (cần token)

#### POST /api/user/auto-refill
Auto refill coins (cần token)

### Room

#### GET /api/room/list
Lấy danh sách phòng

#### POST /api/room/create
Tạo phòng mới (cần token)

#### POST /api/room/:id/join
Tham gia phòng (cần token)

#### POST /api/room/:id/leave
Rời phòng (cần token)

### Shop

#### GET /api/shop/items
Lấy danh sách vật phẩm

#### POST /api/shop/buy
Mua vật phẩm (cần token)

#### POST /api/shop/sell
Bán vật phẩm (cần token)

### Admin

#### GET /api/admin/users
Lấy danh sách người chơi (cần admin)

#### POST /api/admin/users/:id/coins
Cộng/trừ coins (cần admin)

#### POST /api/admin/users/:id/ban
Ban/unban user (cần admin)

## 🎯 Các Bước Tiếp Theo

### Frontend pages cần hoàn thiện:
1. **Lobby.js** - Danh sách phòng chơi
2. **GameRoom.js** - Giao diện bàn chơi
3. **Profile.js** - Trang hồ sơ cá nhân
4. **Shop.js** - Cửa hàng
5. **AdminPanel.js** - Trang quản trị

### Tính năng nâng cao có thể thêm:
- Jackpot system (nổ hũ)
- Tournament mode (giải đấu)
- Ranking system (bảng xếp hạng)
- Achievement system (thành tựu)
- VIP levels (cấp độ VIP)
- Private messages (tin nhắn riêng)
- Friend system (hệ thống bạn bè)
- Spectator mode (chế độ xem)
- Mobile app (React Native)
- Progressive Web App (PWA)

## 🔒 Bảo Mật

- Mật khẩu được hash với bcrypt
- JWT token cho authentication
- CORS protection
- Rate limiting (cần thêm)
- Input validation
- SQL injection protection (MongoDB)
- XSS protection

## 📝 License

MIT License - Tự do sử dụng cho mục đích cá nhân và thương mại.

## 👨‍💻 Liên Hệ & Hỗ Trợ

Nếu cần hỗ trợ hoặc có câu hỏi, vui lòng tạo issue trên GitHub.

---

**Chúc bạn chơi game vui vẻ! 🎮🃏**
