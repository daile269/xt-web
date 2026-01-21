const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { authenticate } = require("../middleware/auth");

// @route   GET /api/shop/items
// @desc    Get all shop items
// @access  Public
router.get("/items", async (req, res) => {
  try {
    const { type } = req.query;

    const query = { isAvailable: true };
    if (type) query.type = type;

    const items = await Item.find(query).sort({ price: 1 });

    res.json({ success: true, items });
  } catch (error) {
    console.error("Get items error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/shop/buy
// @desc    Buy an item
// @access  Private
router.post("/buy", authenticate, async (req, res) => {
  try {
    const { itemId, quantity = 1 } = req.body;

    const item = await Item.findById(itemId);
    if (!item || !item.isAvailable) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    // Check stock
    if (item.stock !== -1 && item.stock < quantity) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient stock" });
    }

    const user = await User.findById(req.user.id);
    const totalPrice = item.price * quantity;

    // Check if user has enough coins
    if (user.coins < totalPrice) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient coins" });
    }

    const balanceBefore = user.coins;

    // Deduct coins
    user.coins -= totalPrice;
    user.totalCoinsSpent += totalPrice;

    // Add item to inventory
    const existingItem = user.inventory.find(
      (i) => i.itemId.toString() === itemId,
    );
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      user.inventory.push({ itemId, quantity });
    }

    await user.save();

    // Update stock
    if (item.stock !== -1) {
      item.stock -= quantity;
      await item.save();
    }

    // Create transaction
    await Transaction.create({
      userId: user._id,
      type: "purchase",
      amount: totalPrice,
      balanceBefore,
      balanceAfter: user.coins,
      status: "completed",
      description: `Đã mua ${item.name} x${quantity}`,
      metadata: { itemId },
    });

    res.json({
      success: true,
      message: `Đã mua ${item.name} thành công`,
      item,
      quantity,
      totalPrice,
      remainingCoins: user.coins,
    });
  } catch (error) {
    console.error("Mua vật phẩm thất bại:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/shop/sell
// @desc    Sell an item from inventory
// @access  Private
router.post("/sell", authenticate, async (req, res) => {
  try {
    const { itemId, quantity = 1 } = req.body;

    const user = await User.findById(req.user.id);
    const inventoryItem = user.inventory.find(
      (i) => i.itemId.toString() === itemId,
    );

    if (!inventoryItem || inventoryItem.quantity < quantity) {
      return res
        .status(400)
        .json({ success: false, message: "Item not found in inventory" });
    }

    const item = await Item.findById(itemId);
    if (!item.isTradeable) {
      return res
        .status(400)
        .json({ success: false, message: "This item cannot be sold" });
    }

    // Sell price is based on resellPercentage (default to 95% if not set)
    const percentage = (item.resellPercentage || 95) / 100;
    const sellPrice = Math.floor(item.price * percentage);
    const totalSellPrice = sellPrice * quantity;

    const balanceBefore = user.coins;

    // Add coins
    user.coins += totalSellPrice;
    user.totalCoinsEarned += totalSellPrice;

    // Remove item from inventory
    inventoryItem.quantity -= quantity;
    if (inventoryItem.quantity === 0) {
      user.inventory = user.inventory.filter(
        (i) => i.itemId.toString() !== itemId,
      );
    }

    await user.save();

    // Create transaction
    await Transaction.create({
      userId: user._id,
      type: "sale",
      amount: totalSellPrice,
      balanceBefore,
      balanceAfter: user.coins,
      status: "completed",
      description: `Đã bán ${item.name} x${quantity}`,
      metadata: { itemId },
    });

    res.json({
      success: true,
      message: `Đã bán ${item.name} thành công`,
      item,
      quantity,
      totalSellPrice,
      remainingCoins: user.coins,
    });
  } catch (error) {
    console.error("Lỗi khi bán sản phẩm:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/shop/inventory
// @desc    Get user inventory
// @access  Private
router.get("/inventory", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("inventory")
      .populate("inventory.itemId");

    res.json({ success: true, inventory: user.inventory });
  } catch (error) {
    console.error("Get inventory error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
