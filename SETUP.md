# 🚀 Hướng Dẫn Cài Đặt Nhanh

## ⚡ Cài đặt Backend

```powershell
# Di chuyển vào thư mục backend
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env
copy .env.example .env

# Chỉnh sửa file .env với thông tin của bạn
notepad .env
```

### Cấu hình .env tối thiểu:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pk-web
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
SESSION_SECRET=your-session-secret-here
FRONTEND_URL=http://localhost:3000
```

## ⚡ Cài đặt Frontend

```powershell
# Di chuyển vào thư mục frontend
cd ..\frontend

# Cài đặt dependencies
npm install
```

## 🗄️ Khởi động Database

### MongoDB
```powershell
# Khởi động MongoDB service (nếu cài đặt dưới dạng service)
net start MongoDB

# Hoặc chạy trực tiếp
mongod --dbpath "C:\data\db"
```

### Redis
```powershell
# Nếu dùng WSL
wsl redis-server

# Hoặc nếu cài Redis for Windows
redis-server
```

## 🎮 Chạy Ứng Dụng

### Terminal 1 - Backend
```powershell
cd backend
npm run dev
```

Backend sẽ chạy tại: **http://localhost:5000**

### Terminal 2 - Frontend
```powershell
cd frontend
npm start
```

Frontend sẽ chạy tại: **http://localhost:3000**

## ✅ Kiểm tra

1. Mở trình duyệt và truy cập: http://localhost:3000
2. Đăng ký tài khoản mới
3. Đăng nhập
4. Vào Lobby để xem danh sách phòng

## 🔧 Tạo Admin User

Sau khi đăng ký, vào MongoDB và set user thành admin:

```javascript
// Mở MongoDB Compass hoặc mongo shell
use pk-web

// Tìm user và set isAdmin = true
db.users.updateOne(
  { username: "your-username" },
  { $set: { isAdmin: true } }
)
```

## 📦 Cài đặt MongoDB & Redis

### MongoDB
1. Download: https://www.mongodb.com/try/download/community
2. Cài đặt và chọn "Install as Service"
3. Hoặc download MongoDB Compass (GUI tool)

### Redis
**Option 1: Windows Subsystem for Linux (WSL)**
```powershell
# Cài đặt WSL
wsl --install

# Trong WSL, cài Redis
sudo apt-get update
sudo apt-get install redis-server
redis-server
```

**Option 2: Redis for Windows**
1. Download từ: https://github.com/microsoftarchive/redis/releases
2. Giải nén và chạy `redis-server.exe`

**Option 3: Docker**
```powershell
docker run --name redis -p 6379:6379 -d redis
```

## 🐛 Xử lý lỗi thường gặp

### Lỗi: "Cannot connect to MongoDB"
- Kiểm tra MongoDB service đang chạy
- Kiểm tra port 27017 có bị chiếm không

### Lỗi: "Cannot connect to Redis"
- Kiểm tra Redis server đang chạy
- Nếu không có Redis, backend vẫn chạy được (chỉ không có cache)

### Lỗi: "Port 3000 already in use"
```powershell
# Tìm process đang dùng port 3000
netstat -ano | findstr :3000

# Kill process (thay PID bằng số hiện ra)
taskkill /PID <PID> /F
```

### Lỗi: "Port 5000 already in use"
```powershell
# Tương tự với port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

## 📱 Truy cập từ thiết bị khác

1. Tìm IP của máy tính:
```powershell
ipconfig
# Tìm IPv4 Address
```

2. Cập nhật file .env:
```env
FRONTEND_URL=http://<YOUR_IP>:3000
```

3. Cập nhật frontend/.env:
```env
REACT_APP_API_URL=http://<YOUR_IP>:5000
REACT_APP_SOCKET_URL=http://<YOUR_IP>:5000
```

4. Truy cập từ thiết bị khác:
```
http://<YOUR_IP>:3000
```

## 🎯 Các lệnh hữu ích

```powershell
# Backend
npm run dev          # Chạy với nodemon (auto-reload)
npm start            # Chạy production mode

# Frontend  
npm start            # Development mode
npm run build        # Build production
npm test             # Run tests

# MongoDB
mongod               # Start MongoDB
mongo                # Open MongoDB shell

# Redis
redis-server         # Start Redis
redis-cli            # Open Redis CLI
```

## 📚 Tài liệu tham khảo

- Node.js: https://nodejs.org/
- React: https://react.dev/
- Socket.IO: https://socket.io/
- MongoDB: https://www.mongodb.com/docs/
- Redis: https://redis.io/docs/

## 💡 Tips

- Sử dụng VS Code với extensions: ES7+ React/Redux, MongoDB for VS Code
- Cài đặt Postman để test API
- Sử dụng MongoDB Compass để quản lý database
- Dùng Redux DevTools để debug state (nếu cần)

---

Chúc bạn setup thành công! 🎉
