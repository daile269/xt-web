const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// Dashboard Overview
router.get('/stats', adminController.getDashboardStats);

// User Management (Search, List, Ban, Coins)
router.get('/users', adminController.getUsers);
router.put('/users/:userId/ban', adminController.toggleBanUser);
router.put('/users/:userId/coins', adminController.updateUserCoins);

module.exports = router;
