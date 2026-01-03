# 🚀 Hướng Dẫn Deploy Production

## 📋 Chuẩn bị trước khi deploy

### 1. Tạo tài khoản miễn phí
- [Vercel](https://vercel.com) - Frontend
- [Render](https://render.com) - Backend
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Database
- [Upstash](https://upstash.com) - Redis (optional)

---

## 🗄️ BƯỚC 1: Setup Database

### MongoDB Atlas (Free Tier)
1. Vào https://www.mongodb.com/cloud/atlas
2. Tạo cluster mới (chọn FREE tier)
3. Tạo database user (username/password)
4. Whitelist IP: `0.0.0.0/0` (allow all)
5. Copy connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/pk-web
   ```

### Upstash Redis (Free Tier - Optional)
1. Vào https://upstash.com
2. Tạo database mới (chọn region gần nhất)
3. Copy Redis URL:
   ```
   redis://default:password@host:port
   ```

---

## 🔧 BƯỚC 2: Deploy Backend (Render)

### Cách 1: Deploy từ GitHub (Khuyến nghị)

1. **Push code lên GitHub**
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

3. **Thêm Environment Variables**
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://... (từ Atlas)
   REDIS_URL=redis://... (từ Upstash)
   JWT_SECRET=your-super-secret-key-min-32-chars
   SESSION_SECRET=another-secret-key-min-32-chars
   FRONTEND_URL=https://your-app.vercel.app
   ```

4. **Deploy** - Render sẽ tự động build và deploy

5. **Copy Backend URL**: `https://pk-web-backend.onrender.com`

### Cách 2: Deploy Manual (không cần GitHub)

```bash
# Install Render CLI
npm install -g render

# Login
render login

# Deploy
cd backend
render deploy
```

---

## 🎨 BƯỚC 3: Deploy Frontend (Vercel)

### Cách 1: Deploy từ GitHub (Khuyến nghị)

1. **Cập nhật .env.production**
   ```env
   REACT_APP_API_URL=https://pk-web-backend.onrender.com
   REACT_APP_WS_URL=https://pk-web-backend.onrender.com
   ```

2. **Push code lên GitHub** (nếu chưa)

3. **Deploy trên Vercel**
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

4. **Thêm Environment Variables**
   ```
   REACT_APP_API_URL=https://pk-web-backend.onrender.com
   REACT_APP_WS_URL=https://pk-web-backend.onrender.com
   ```

5. **Deploy** - Vercel sẽ tự động build

6. **Copy Frontend URL**: `https://pk-web.vercel.app`

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
- Backend: https://pk-web-backend.onrender.com/api/health
- Frontend: https://pk-web.vercel.app

### Test Features
1. Đăng ký tài khoản mới
2. Đăng nhập
3. Tạo phòng
4. Vào phòng và chơi game
5. Kiểm tra real-time updates (Socket.IO)

---

## 🚨 Lưu ý quan trọng

### Render Free Tier
- ⚠️ **Tự động sleep sau 15 phút không hoạt động**
- 🕐 **Cold start ~30 giây** khi wake up
- 💡 **Giải pháp**: 
  - Dùng [UptimeRobot](https://uptimerobot.com) ping mỗi 10 phút
  - Upgrade lên paid plan ($7/month)

### Vercel Free Tier
- ✅ Không giới hạn bandwidth
- ✅ 100GB bandwidth/tháng
- ✅ Tự động SSL certificate

### MongoDB Atlas Free Tier
- ✅ 512MB storage
- ✅ Shared cluster
- ⚠️ Giới hạn connections (tối ưu connection pooling)

---

## 🔧 Troubleshooting

### Lỗi CORS
```javascript
// backend/src/server.js
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://pk-web.vercel.app',
  'http://localhost:3000'
];
```

### Lỗi WebSocket
```javascript
// frontend/src/services/socket.js
const socket = io(process.env.REACT_APP_WS_URL, {
  transports: ['websocket', 'polling'],
  upgrade: true
});
```

### Backend không wake up
- Thêm health check endpoint
- Dùng UptimeRobot ping mỗi 10 phút

---

## 🎯 Custom Domain (Optional)

### Vercel
1. Mua domain từ Namecheap/GoDaddy
2. Add domain trong Vercel dashboard
3. Cập nhật DNS records

### Render
1. Add custom domain trong Render dashboard
2. Cập nhật DNS CNAME record

---

## 📊 Monitoring

### Free Tools
- [UptimeRobot](https://uptimerobot.com) - Uptime monitoring
- [LogRocket](https://logrocket.com) - Error tracking
- [Sentry](https://sentry.io) - Error reporting

---

## 💰 Chi phí dự kiến

| Service | Free Tier | Paid |
|---------|-----------|------|
| **Vercel** | ✅ Unlimited | $20/month (Pro) |
| **Render** | ✅ 750 hours/month | $7/month |
| **MongoDB Atlas** | ✅ 512MB | $9/month (M10) |
| **Upstash Redis** | ✅ 10K commands/day | $0.2/100K |
| **Total** | **$0/month** 🎉 | ~$36/month |

---

## 🚀 Quick Deploy Commands

```bash
# 1. Push to GitHub
git add .
git commit -m "Ready for production"
git push

# 2. Deploy Frontend
cd frontend
vercel --prod

# 3. Render auto-deploy từ GitHub

# Done! ✅
```

---

## 📝 Checklist

- [ ] MongoDB Atlas setup
- [ ] Upstash Redis setup (optional)
- [ ] Push code to GitHub
- [ ] Deploy Backend to Render
- [ ] Copy Backend URL
- [ ] Update Frontend .env.production
- [ ] Deploy Frontend to Vercel
- [ ] Update Backend CORS settings
- [ ] Test all features
- [ ] Setup UptimeRobot (optional)
- [ ] Configure custom domain (optional)

---

**Chúc bạn deploy thành công! 🎉**

Nếu gặp vấn đề gì, hãy check logs:
- Render: Dashboard → Logs
- Vercel: Deployment → View Function Logs
