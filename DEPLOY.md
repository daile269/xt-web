# 🚀 Hướng Dẫn Deploy Lên Vercel và Render

## ⚠️ LƯU Ý QUAN TRỌNG VỀ BẢO MẬT

**KHÔNG BAO GIỜ COMMIT FILE .ENV LÊN GIT!**

File `.env` đã được thêm vào `.gitignore` để bảo vệ thông tin nhạy cảm:
- Database passwords
- JWT secrets
- API keys
- Session secrets

### File .env chỉ dùng LOCAL, trên production dùng Environment Variables!

---

## 📋 Chuẩn bị trước khi deploy

### 1. Tạo tài khoản miễn phí
- [Vercel](https://vercel.com) - Frontend
- [Render](https://render.com) - Backend
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Database

### 2. Kiểm tra .gitignore
Đảm bảo file `.gitignore` có:
```
.env
.env.local
.env.production
backend/.env
frontend/.env
```

---

## 🗄️ BƯỚC 1: Setup Database

### MongoDB Atlas (Free Tier)
1. Vào https://www.mongodb.com/cloud/atlas
2. Tạo cluster mới (chọn FREE tier M0)
3. Region: Singapore hoặc gần nhất
4. Tạo database user (username/password)
5. **Network Access**: Whitelist IP: `0.0.0.0/0` (allow all)
6. Copy connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/pk-web
   ```

---

## 🔧 BƯỚC 2: Deploy Backend (Render)

### 2.1 Tạo Redis trên Render
1. Vào Render Dashboard
2. **New** → **Redis**
3. Đặt tên: `pk-web-redis`
4. Plan: **Free**
5. Region: **Singapore**
6. Create → Copy **Internal Redis URL**

### 2.2 Deploy Backend từ GitHub

1. **Push code lên GitHub** (nếu chưa)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/pk-web.git
   git push -u origin main
   ```

2. **Deploy trên Render**
   - Vào https://render.com
   - Click "New" → "Web Service"
   - Connect GitHub repository
   - Cấu hình:
     - **Name**: `pk-web-backend`
     - **Region**: Singapore (gần Việt Nam)
     - **Branch**: `main`
     - **Root Directory**: `backend`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free

3. **Thêm Environment Variables** (⚠️ KHÔNG DÙNG FILE .ENV!)
   
   Click **Add Environment Variable** và thêm từng cái:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pk-web
   REDIS_URL=redis://red-xxx:6379
   JWT_SECRET=<tạo chuỗi random 32+ ký tự>
   JWT_EXPIRE=604800
   SESSION_SECRET=<tạo chuỗi random 32+ ký tự>
   FRONTEND_URL=https://your-app.vercel.app
   DEFAULT_COINS=10000
   DAILY_BONUS_COINS=1000
   AUTO_REFILL_COINS=5000
   MAX_REFILL_COUNT=3
   HOUSE_RAKE_PERCENTAGE=5
   JACKPOT_PERCENTAGE=2
   ```

   **Tạo Secret Key mạnh:**
   ```bash
   # Linux/Mac
   openssl rand -base64 32
   
   # Windows PowerShell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   
   # Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **Deploy** - Render sẽ tự động build và deploy

5. **Copy Backend URL**: `https://pk-web-backend.onrender.com`

---

## 🎨 BƯỚC 3: Deploy Frontend (Vercel)

### Deploy từ GitHub

1. **Deploy trên Vercel**
   - Vào https://vercel.com
   - Click "New Project"
   - Import từ GitHub
   - Chọn repository `pk-web`
   - Cấu hình:
     - **Framework Preset**: Create React App
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `build`
     - **Install Command**: `npm install`

2. **Thêm Environment Variables** (⚠️ KHÔNG DÙNG FILE .ENV!)
   
   Click **Add Environment Variable**:
   ```
   REACT_APP_API_URL=https://pk-web-backend.onrender.com
   REACT_APP_SOCKET_URL=https://pk-web-backend.onrender.com
   REACT_APP_NAME=Poker & Xì Tố
   ```

3. **Deploy** - Vercel sẽ tự động build

4. **Copy Frontend URL**: `https://pk-web.vercel.app`

---

## 🔄 BƯỚC 4: Cập Nhật CORS & Frontend URL

1. **Quay lại Render Backend Environment Variables**
   - Cập nhật `FRONTEND_URL` với URL Vercel vừa tạo:
   ```
   FRONTEND_URL=https://pk-web.vercel.app
   ```

2. **Redeploy Backend** để áp dụng thay đổi

### Cách 2: Deploy bằng Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel

# Deploy production
vercel --prod
```

---

## 🔄 BƯỚC 4: Cập nhật CORS & URLs

1. **Cập nhật Backend Environment trên Render**
   ```
   FRONTEND_URL=https://pk-web.vercel.app
   ALLOWED_ORIGINS=https://pk-web.vercel.app
   ```

2. **Redeploy Backend** trên Render

3. **Test ứng dụng** tại URL Vercel

---

## ✅ BƯỚC 5: Kiểm tra

### Health Check
- Backend: `https://pk-web-backend.onrender.com/api/health`
- Frontend: `https://pk-web.vercel.app`

### Test Features
1. ✅ Đăng ký tài khoản mới
2. ✅ Đăng nhập
3. ✅ Tạo phòng
4. ✅ Vào phòng và chơi game
5. ✅ Kiểm tra real-time updates (Socket.IO)

---

## 🔒 BẢO MẬT - CHECKLIST

### ✅ Đã hoàn thành:
- [x] File `.env` được thêm vào `.gitignore`
- [x] Tạo file `.env.example` để hướng dẫn
- [x] Sử dụng Environment Variables trên Vercel/Render

### ⚠️ CẦN KIỂM TRA:
- [ ] JWT_SECRET phải là chuỗi random mạnh (32+ ký tự)
- [ ] SESSION_SECRET phải khác JWT_SECRET
- [ ] MongoDB connection string có password mạnh
- [ ] KHÔNG BAO GIỜ commit file `.env` vào git
- [ ] MongoDB Network Access chỉ allow IP cần thiết (hoặc 0.0.0.0/0)
- [ ] Redis password được set (nếu dùng)

### 🛡️ Best Practices:
```bash
# Kiểm tra git status trước khi commit
git status

# Đảm bảo .env không được track
git ls-files | grep .env  # Không có output là OK

# Nếu đã commit .env nhầm
git rm --cached backend/.env
git rm --cached frontend/.env
git commit -m "Remove .env files"
```

---

## 🚨 Lưu ý quan trọng

### Render Free Tier
- ⚠️ **Tự động sleep sau 15 phút không hoạt động**
- 🕐 **Cold start ~30-50 giây** khi wake up
- 💡 **Giải pháp**: 
  - Dùng [UptimeRobot](https://uptimerobot.com) ping mỗi 10 phút
  - Hoặc [Cron-Job.org](https://cron-job.org)
  - Upgrade lên paid plan ($7/month) để always-on

### Vercel Free Tier
- ✅ Không sleep
- ✅ 100GB bandwidth/tháng
- ✅ Tự động SSL certificate
- ✅ Global CDN

### MongoDB Atlas Free Tier (M0)
- ✅ 512MB storage
- ✅ Shared cluster
- ⚠️ Max 500 connections
- ⚠️ Có thể bị giới hạn nếu traffic cao

---

## 🔧 Troubleshooting

### ❌ Lỗi: "Cannot connect to backend"
**Nguyên nhân**: Backend đang sleep (Render free tier)

**Giải pháp**: 
- Đợi 30-50 giây để backend wake up
- Setup UptimeRobot để ping định kỳ

### ❌ Lỗi CORS
**Nguyên nhân**: `FRONTEND_URL` không khớp

**Giải pháp**:
```javascript
// backend/src/server.js - Kiểm tra
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### ❌ Lỗi: "MongoNetworkError"
**Nguyên nhân**: IP chưa được whitelist

**Giải pháp**: 
- Vào MongoDB Atlas
- Network Access → Add IP Address → `0.0.0.0/0`

### ❌ Lỗi: WebSocket connection failed
**Nguyên nhân**: Socket.IO config không đúng

**Giải pháp**:
```javascript
// frontend/src/services/socket.js
const socket = io(process.env.REACT_APP_SOCKET_URL, {
  transports: ['websocket', 'polling'],
  upgrade: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10
});
```

---

## 📝 CHECKLIST DEPLOY

### Trước khi deploy:
- [ ] Git ignore file `.env` 
- [ ] Tạo file `.env.example` với các key cần thiết
- [ ] Remove tất cả hardcoded secrets trong code
- [ ] Test local hoạt động tốt
- [ ] Push code lên GitHub

### MongoDB Atlas:
- [ ] Tạo cluster (Free M0)
- [ ] Tạo database user với password mạnh
- [ ] Network Access: Add `0.0.0.0/0`
- [ ] Copy connection string

### Render Backend:
- [ ] Tạo Redis instance
- [ ] Tạo Web Service
- [ ] Set Root Directory = `backend`
- [ ] Add Environment Variables (KHÔNG commit .env!)
- [ ] Deploy thành công
- [ ] Copy backend URL

### Vercel Frontend:
- [ ] Import project từ GitHub
- [ ] Set Root Directory = `frontend`
- [ ] Add Environment Variables (KHÔNG commit .env!)
- [ ] Deploy thành công
- [ ] Copy frontend URL

### Hoàn tất:
- [ ] Cập nhật `FRONTEND_URL` trong Render backend
- [ ] Redeploy backend
- [ ] Test đăng ký/đăng nhập
- [ ] Test tạo phòng và chơi game
- [ ] Test real-time với Socket.IO
- [ ] Setup UptimeRobot (optional)

---

## 🎯 Custom Domain (Optional)

### Vercel Custom Domain
1. Mua domain từ Namecheap/GoDaddy/Cloudflare
2. Vào Vercel Project → Settings → Domains
3. Add domain: `yourdomain.com`
4. Cập nhật DNS records theo hướng dẫn Vercel

### Render Custom Domain
1. Vào Render Service → Settings → Custom Domain
2. Add domain: `api.yourdomain.com`
3. Cập nhật DNS CNAME: `api.yourdomain.com` → `your-service.onrender.com`

---

## 📊 Monitoring & Optimization

### UptimeRobot Setup (Giữ backend luôn awake)
1. Đăng ký [UptimeRobot](https://uptimerobot.com) (Free)
2. Add Monitor:
   - Type: HTTP(s)
   - URL: `https://pk-web-backend.onrender.com/api/health`
   - Interval: 5 minutes
3. Điều này sẽ ping backend mỗi 5 phút để tránh sleep

### Free Monitoring Tools
- ✅ [UptimeRobot](https://uptimerobot.com) - Uptime monitoring
- ✅ [Sentry](https://sentry.io) - Error tracking
- ✅ [LogRocket](https://logrocket.com) - Session replay
- ✅ [Google Analytics](https://analytics.google.com) - User analytics

---

## 🎉 Hoàn Thành!

**Live URLs:**
- 🌐 Frontend: `https://your-app.vercel.app`
- 🔧 Backend: `https://pk-web-backend.onrender.com`
- 🗄️ Database: MongoDB Atlas
- 💾 Cache: Render Redis

### Important Links:
- [Vercel Dashboard](https://vercel.com/dashboard) - Quản lý frontend
- [Render Dashboard](https://dashboard.render.com) - Quản lý backend
- [MongoDB Atlas](https://cloud.mongodb.com) - Quản lý database

### Bảo mật:
- ✅ File `.env` KHÔNG được commit lên git
- ✅ Secrets được quản lý qua Environment Variables
- ✅ MongoDB có Network Access control
- ✅ CORS được config đúng

**Chúc mừng! Ứng dụng của bạn đã live! 🚀**

---

## 💰 Chi phí dự kiến

| Service | Free Tier | Giới hạn | Paid |
|---------|-----------|----------|------|
| **Vercel** | ✅ Free | 100GB bandwidth | $20/month (Pro) |
| **Render** | ✅ Free | 750 hours/month, sleep sau 15 phút | $7/month (always-on) |
| **MongoDB Atlas** | ✅ Free | 512MB storage | $9/month (M10) |
| **Render Redis** | ✅ Free | 25MB storage | $10/month |
| **Total** | **$0/month** 🎉 | Đủ cho demo/testing | ~$46/month (production) |

---

## 🚀 Quick Deploy Script

```bash
# Kiểm tra .env không được track
git status | grep .env
# Nếu có .env → STOP và remove khỏi git

# Push to GitHub
git add .
git commit -m "Ready for production deployment"
git push origin main

# Deploy sẽ tự động:
# - Render tự động build từ GitHub
# - Vercel tự động build từ GitHub

# Done! ✅
```

---

## ⚠️ LƯU Ý QUAN TRỌNG CUỐI CÙNG

### 🔐 KHÔNG BAO GIỜ:
- ❌ Commit file `.env` lên git
- ❌ Hardcode password/secret trong code
- ❌ Share secrets qua chat/email
- ❌ Để `.env` trong public repository

### ✅ LUÔN LUÔN:
- ✅ Dùng `.gitignore` cho tất cả `.env` files
- ✅ Dùng Environment Variables trên platform
- ✅ Tạo secrets mạnh (32+ ký tự random)
- ✅ Rotate secrets định kỳ (3-6 tháng)
- ✅ Backup environment variables ở nơi an toàn

---

**Chúc bạn deploy thành công! 🎉**

Nếu gặp vấn đề, check logs:
- 📊 Render: Dashboard → Service → Logs tab
- 📊 Vercel: Project → Deployments → Click deployment → View Function Logs
- 📊 MongoDB: Atlas → Clusters → Metrics

**Support:**
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)
