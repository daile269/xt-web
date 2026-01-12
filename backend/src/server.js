const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const connectDB = require('./config/database');
const connectRedis = require('./config/redis');
const configurePassport = require('./config/passport');
const socketHandlers = require('./socket');

const app = express();
const server = http.createServer(app);

// CORS origin checker - allow localhost and local network IPs
const corsOrigin = (origin, callback) => {
  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) return callback(null, true);
  
  // Allow localhost
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return callback(null, true);
  }
  
  // Allow local network IPs (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
  const localIpPattern = /^http:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
  if (localIpPattern.test(origin)) {
    return callback(null, true);
  }
  
  // Allow environment-specified frontend URL
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
    return callback(null, true);
  }
  
  callback(new Error('Not allowed by CORS'));
};

const io = socketIo(server, {
  cors: {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000
});

// Middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
configurePassport(passport);

// Connect to databases
connectDB();
connectRedis();

// Start room cleanup service
const { startRoomCleanup } = require('./services/roomCleanup');
startRoomCleanup();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/room', require('./routes/room'));
app.use('/api/game', require('./routes/game'));
app.use('/api/transaction', require('./routes/transaction'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/shop', require('./routes/shop'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Socket.IO handlers
socketHandlers(io);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: err.message || 'Internal Server Error' 
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
});

module.exports = { app, io };
