# 🔐 Environment Variables - Security Guide

## ⚠️ QUAN TRỌNG: BẢO MẬT

**File `.env` chứa thông tin nhạy cảm và KHÔNG BAO GIỜ được commit lên Git!**

### ❌ KHÔNG được commit:
- `.env`
- `.env.local`
- `.env.production`
- `.env.development`
- Bất kỳ file nào chứa passwords, secrets, API keys

### ✅ CÓ THỂ commit:
- `.env.example` - File mẫu không chứa giá trị thật
- `.gitignore` - Đảm bảo ignore các file .env

---

## 📂 Cấu Trúc File

```
pk-web/
├── .gitignore           # ✅ Commit - Ignore .env files
├── backend/
│   ├── .env            # ❌ KHÔNG commit - Chỉ dùng local
│   └── .env.example    # ✅ Commit - Template
└── frontend/
    ├── .env            # ❌ KHÔNG commit - Chỉ dùng local
    └── .env.example    # ✅ Commit - Template
```

---

## 🛠️ Setup Local Development

### 1. Backend Environment Variables

Copy file example và điền giá trị:
```bash
cd backend
cp .env.example .env
```

Edit file `.env`:
```env
# Server
PORT=5000
NODE_ENV=development

# Database - Local MongoDB
MONGODB_URI=mongodb://localhost:27017/pk-web

# Redis - Local Redis
REDIS_URL=redis://localhost:6379

# JWT Secret - Tạo random string mới
JWT_SECRET=your-local-jwt-secret-change-me
JWT_EXPIRE=604800

# Session Secret - Tạo random string mới
SESSION_SECRET=your-local-session-secret-change-me

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Game Config
DEFAULT_COINS=10000
DAILY_BONUS_COINS=1000
AUTO_REFILL_COINS=5000
MAX_REFILL_COUNT=3
HOUSE_RAKE_PERCENTAGE=5
JACKPOT_PERCENTAGE=2
```

### 2. Frontend Environment Variables

Copy file example và điền giá trị:
```bash
cd frontend
cp .env.example .env
```

Edit file `.env`:
```env
# Backend API URL
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000

# App Config
REACT_APP_NAME=Poker & Xì Tố
```

---

## 🚀 Production Deployment

### ⚠️ KHÔNG dùng file .env trong production!

Thay vào đó, sử dụng Environment Variables trên platform:

### Render (Backend)
Vào Dashboard → Service → Environment:
```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pk-web
REDIS_URL=redis://red-xxx:6379
JWT_SECRET=<32+ ký tự random>
SESSION_SECRET=<32+ ký tự random khác>
FRONTEND_URL=https://your-app.vercel.app
...
```

### Vercel (Frontend)
Vào Project → Settings → Environment Variables:
```
REACT_APP_API_URL=https://pk-web-backend.onrender.com
REACT_APP_SOCKET_URL=https://pk-web-backend.onrender.com
REACT_APP_NAME=Poker & Xì Tố
```

---

## 🔒 Tạo Secrets Mạnh

### Linux/Mac:
```bash
openssl rand -base64 32
```

### Windows PowerShell:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## ✅ Checklist Bảo Mật

- [ ] File `.env` được thêm vào `.gitignore`
- [ ] File `.env.example` không chứa giá trị thật
- [ ] JWT_SECRET và SESSION_SECRET là chuỗi random mạnh (32+ ký tự)
- [ ] Không hardcode secrets trong source code
- [ ] Production secrets khác với local secrets
- [ ] MongoDB password phức tạp (12+ ký tự, mixed case, numbers, symbols)
- [ ] Không share secrets qua email/chat
- [ ] Backup secrets ở nơi an toàn (password manager)

---

## 🚨 Nếu Đã Commit .env Nhầm

### 1. Remove file khỏi git (giữ local):
```bash
git rm --cached backend/.env
git rm --cached frontend/.env
git commit -m "Remove .env files from git"
git push
```

### 2. Thay đổi TẤT CẢ secrets:
- ✅ Tạo JWT_SECRET mới
- ✅ Tạo SESSION_SECRET mới
- ✅ Đổi MongoDB password
- ✅ Đổi Redis password (nếu có)

### 3. Cập nhật secrets mới:
- Update local `.env`
- Update Render environment variables
- Update Vercel environment variables

---

## 📚 Best Practices

### 1. Phân biệt Environment
```
Development:  .env (local only)
Production:   Platform Environment Variables
```

### 2. Naming Convention
```
Backend:  VARIABLE_NAME=value
Frontend: REACT_APP_VARIABLE_NAME=value  (bắt buộc prefix REACT_APP_)
```

### 3. Không commit sensitive data
```bash
# Kiểm tra trước khi commit
git status | grep .env

# Nếu có .env → STOP và remove
```

### 4. Sử dụng .env.example
```bash
# Template cho team members
cp .env.example .env
# Edit .env với giá trị thật
```

---

## 🔍 Kiểm Tra Git

### Đảm bảo .env không được track:
```bash
# Không có output = OK
git ls-files | grep .env

# Nếu có output = .env đang được track → REMOVE
```

### Kiểm tra .gitignore:
```bash
cat .gitignore | grep .env
# Output: .env, .env.local, etc.
```

---

## 📖 Tài Liệu Tham Khảo

- [12 Factor App - Config](https://12factor.net/config)
- [OWASP - Configuration](https://owasp.org/www-project-top-ten/)
- [Render Docs - Environment Variables](https://render.com/docs/environment-variables)
- [Vercel Docs - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## ⚡ Quick Reference

```bash
# Setup local
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Generate secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Check git status
git status | grep .env  # Should be empty

# Remove from git if needed
git rm --cached **/.env
```

---

**Remember: Security is not optional! 🔐**
