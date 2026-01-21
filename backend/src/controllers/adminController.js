const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Item = require('../models/Item');

/**
 * Get dashboard statistics - Overview only
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isOnline: true });
    const bannedUsers = await User.countDocuments({ isBanned: true });

    // Total coins in system
    const coinsStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalCoins: { $sum: '$coins' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers
        },
        coins: {
          totalSystemCoins: coinsStats[0]?.totalCoins || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy thống kê' });
  }
};

/**
 * Get users with search & ban status
 */
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('username displayName coins isBanned isOnline createdAt avatar bankAccount')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(count / limit),
        total: count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách người dùng' });
  }
};

/**
 * Toggle Ban User
 */
exports.toggleBanUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    if (user.isAdmin) return res.status(403).json({ success: false, message: 'Không thể khóa tài khoản Admin' });

    user.isBanned = !user.isBanned;
    await user.save();

    res.json({
      success: true,
      isBanned: user.isBanned,
      message: user.isBanned ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản'
    });
  } catch (error) {
    console.error('Toggle ban error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái' });
  }
};

/**
 * Update User Coins (Add/Subtract)
 */
exports.updateUserCoins = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người chơi' });

    const oldBalance = user.coins;
    user.coins += amount;
    if (user.coins < 0) user.coins = 0;
    await user.save();

    // Log transaction - Using 'admin-adjustment' to match model enum
    await Transaction.create({
      userId: user._id,
      type: 'admin-adjustment',
      amount: Math.abs(amount),
      balanceBefore: oldBalance,
      balanceAfter: user.coins,
      status: 'completed',
      description: reason || `${amount > 0 ? 'Cộng' : 'Trừ'} tiền bởi Admin`
    });

    res.json({
      success: true,
      newBalance: user.coins,
      message: 'Cập nhật tiền thành công'
    });
  } catch (error) {
    console.error('Update coins error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật tiền' });
  }
};


/**
 * Item Management
 */
exports.getAllItems = async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách vật phẩm' });
  }
};

exports.createItem = async (req, res) => {
  try {
    const item = new Item(req.body);
    await item.save();
    res.json({ success: true, data: item, message: 'Đã thêm vật phẩm mới' });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thêm vật phẩm' });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await Item.findByIdAndUpdate(itemId, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy vật phẩm' });
    res.json({ success: true, data: item, message: 'Đã cập nhật vật phẩm' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật vật phẩm' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await Item.findByIdAndDelete(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy vật phẩm' });
    res.json({ success: true, message: 'Đã xóa vật phẩm' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi xóa vật phẩm' });
  }
};
