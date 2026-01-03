const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// @route   POST /api/transaction/request-deposit
// @desc    Request coin deposit
// @access  Private
router.post('/request-deposit', authenticate, async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const user = await User.findById(req.user.id);

    const transaction = await Transaction.create({
      userId: user._id,
      type: 'deposit',
      amount,
      balanceBefore: user.coins,
      balanceAfter: user.coins, // Will be updated when processed
      status: 'pending',
      description: 'Deposit request',
      metadata: {
        bankDetails: {
          bankName: bankDetails?.bankName || user.bankAccount?.bankName,
          accountNumber: bankDetails?.accountNumber || user.bankAccount?.accountNumber,
          accountHolder: bankDetails?.accountHolder || user.bankAccount?.accountHolder,
          amount
        }
      }
    });

    res.json({ 
      success: true, 
      message: 'Deposit request submitted. Please contact admin for bank details.',
      transaction
    });
  } catch (error) {
    console.error('Request deposit error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/transaction/request-withdrawal
// @desc    Request coin withdrawal
// @access  Private
router.post('/request-withdrawal', authenticate, async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const user = await User.findById(req.user.id);

    if (user.coins < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient coins' });
    }

    const transaction = await Transaction.create({
      userId: user._id,
      type: 'withdrawal',
      amount,
      balanceBefore: user.coins,
      balanceAfter: user.coins - amount,
      status: 'pending',
      description: 'Withdrawal request',
      metadata: {
        bankDetails: {
          bankName: bankDetails?.bankName || user.bankAccount?.bankName,
          accountNumber: bankDetails?.accountNumber || user.bankAccount?.accountNumber,
          accountHolder: bankDetails?.accountHolder || user.bankAccount?.accountHolder,
          amount
        }
      }
    });

    res.json({ 
      success: true, 
      message: 'Withdrawal request submitted. Admin will process your request.',
      transaction
    });
  } catch (error) {
    console.error('Request withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
