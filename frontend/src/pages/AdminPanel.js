import React, { useState, useEffect, useCallback } from "react";
import { adminAPI } from "../services/api";
import { toast } from "react-toastify";
import "./AdminPanel.css";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [page] = useState(1);
  const [loading, setLoading] = useState(true);

  // User Management States
  const [updatingCoins, setUpdatingCoins] = useState(null); // { userId, amount: 0 }
  const [confirmBan, setConfirmBan] = useState(null); // User object

  // Item Management States
  const [editingItem, setEditingItem] = useState(null); // Item object or {} for new
  const [confirmDelete, setConfirmDelete] = useState(null); // Item object

  const typeMap = {
    avatar: "Ảnh đại diện",
    gift: "Quà tặng",
    "chip-package": "Gói Chip",
    special: "Đặc biệt",
  };

  const rarityMap = {
    common: "Thường",
    rare: "Hiếm",
    epic: "Sử thi",
    legendary: "Huyền thoại",
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === "users") {
        const [statsRes, usersRes] = await Promise.all([
          adminAPI.getStats(),
          adminAPI.getUsers({ page, search }),
        ]);
        setStats(statsRes.data.data);
        setUsers(usersRes.data.data.users);
      } else {
        const itemsRes = await adminAPI.getItems();
        setItems(itemsRes.data.data);
      }
      setLoading(false);
    } catch (error) {
      toast.error("Lỗi khi tải dữ liệu");
      setLoading(false);
    }
  }, [activeTab, page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleBan = async (userId) => {
    try {
      const res = await adminAPI.banUser(userId, {});
      if (res.data.success) {
        toast.success(res.data.message);
        setConfirmBan(null);
        fetchData();
      }
    } catch (error) {
      toast.error("Không thể thực hiện");
    }
  };

  const handleUpdateCoins = async (userId, amount) => {
    if (!amount) return;
    try {
      const res = await adminAPI.adjustCoins(userId, { amount });
      if (res.data.success) {
        toast.success("Đã cập nhật tiền");
        setUpdatingCoins(null);
        fetchData();
      }
    } catch (error) {
      toast.error("Lỗi khi cập nhật tiền");
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const method = editingItem._id ? "updateItem" : "createItem";
      const args = editingItem._id
        ? [editingItem._id, editingItem]
        : [editingItem];

      const res = await adminAPI[method](...args);
      if (res.data.success) {
        toast.success(res.data.message);
        setEditingItem(null);
        fetchData();
      }
    } catch (error) {
      toast.error("Lỗi khi lưu vật phẩm");
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const res = await adminAPI.deleteItem(itemId);
      if (res.data.success) {
        toast.success(res.data.message);
        setConfirmDelete(null);
        fetchData();
      }
    } catch (error) {
      toast.error("Lỗi khi xóa vật phẩm");
    }
  };

  if (loading && !stats && activeTab === "users")
    return <div className="admin-loading">Đang tải...</div>;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Quản Trị Hệ Thống</h1>
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            👥 Người Chơi
          </button>
          <button
            className={`tab-btn ${activeTab === "items" ? "active" : ""}`}
            onClick={() => setActiveTab("items")}
          >
            🏪 Cửa Hàng
          </button>
        </div>

        {activeTab === "users" && stats && (
          <div className="admin-overview">
            <div className="stat-card">
              <h3>Người Dùng</h3>
              <p className="stat-value">{stats?.users.total}</p>
              <span className="stat-detail">
                Online: {stats?.users.active} | Khóa: {stats?.users.banned}
              </span>
            </div>
            <div className="stat-card">
              <h3>Tổng Tiền Hệ Thống</h3>
              <p className="stat-value">
                💲{stats?.coins.totalSystemCoins.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </header>

      {activeTab === "users" ? (
        <section className="user-management">
          <div className="section-header">
            <h2>Quản Lý Người Chơi</h2>
            <div className="search-bar">
              <input
                type="text"
                placeholder="Tìm tên người dùng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Người chơi</th>
                <th>Tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tham gia</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div className="user-info">
                      <img src={user.avatar} alt="" className="admin-avatar" />
                      <div>
                        <div className="username">{user.username}</div>
                        <div className="display-name">{user.displayName}</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.coins.toLocaleString()}</td>
                  <td
                    className={
                      user.isBanned ? "status-banned" : "status-active"
                    }
                  >
                    {user.isBanned
                      ? "Bị Khóa"
                      : user.isOnline
                        ? "Online"
                        : "Offline"}
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="actions">
                    <button
                      className="btn-ban"
                      onClick={() => setConfirmBan(user)}
                    >
                      {user.isBanned ? "Mở Khóa" : "Khóa"}
                    </button>
                    <button
                      className="btn-add"
                      onClick={() =>
                        setUpdatingCoins({
                          userId: user._id,
                          type: "add",
                          amount: 0,
                        })
                      }
                    >
                      + Cộng
                    </button>
                    <button
                      className="btn-sub"
                      onClick={() =>
                        setUpdatingCoins({
                          userId: user._id,
                          type: "sub",
                          amount: 0,
                        })
                      }
                    >
                      - Trừ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="item-management">
          <div className="section-header">
            <h2>Quản Lý Vật Phẩm</h2>
            <button
              className="btn-create"
              onClick={() =>
                setEditingItem({
                  name: "",
                  description: "",
                  price: 0,
                  image: "",
                  type: "avatar",
                  rarity: "common",
                  isAvailable: true,
                })
              }
            >
              + Thêm vật phẩm
            </button>
          </div>

          <div className="items-grid">
            {items.map((item) => (
              <div key={item._id} className="admin-item-card">
                <div className="item-img-container">
                  <img src={item.image} alt={item.name} />
                  <span className={`rarity-badge ${item.rarity}`}>
                    {rarityMap[item.rarity] || item.rarity}
                  </span>
                </div>
                <div className="item-details">
                  <h4>{item.name}</h4>
                  <p className="item-price">💲{item.price.toLocaleString()}</p>
                  <p className="item-type">{typeMap[item.type] || item.type}</p>
                </div>
                <div className="item-actions">
                  <button
                    className="btn-edit"
                    onClick={() => setEditingItem(item)}
                  >
                    Sửa
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => setConfirmDelete(item)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modals */}
      {updatingCoins && (
        <div className="admin-modal">
          <div className="modal-content">
            <h3>
              {updatingCoins.type === "add" ? "➕ Cộng tiền" : "➖ Trừ tiền"}
            </h3>
            <p>
              Nhập số tiền muốn {updatingCoins.type === "add" ? "cộng" : "trừ"}:
            </p>
            <input
              type="number"
              placeholder="Ví dụ: 100000"
              autoFocus
              onChange={(e) =>
                setUpdatingCoins({
                  ...updatingCoins,
                  amount: Math.abs(parseInt(e.target.value)),
                })
              }
            />
            <div className="modal-btns">
              <button
                className="btn-confirm-success"
                onClick={() =>
                  handleUpdateCoins(
                    updatingCoins.userId,
                    updatingCoins.type === "add"
                      ? updatingCoins.amount
                      : -updatingCoins.amount,
                  )
                }
              >
                Xác nhận
              </button>
              <button
                className="btn-cancel"
                onClick={() => setUpdatingCoins(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBan && (
        <div className="admin-modal">
          <div className="modal-content">
            <h3>
              {confirmBan.isBanned
                ? "🔓 Xác nhận mở khóa"
                : "🔒 Xác nhận khóa tài khoản"}
            </h3>
            <p>
              Bạn có chắc chắn muốn {confirmBan.isBanned ? "mở khóa" : "khóa"}{" "}
              tài khoản <strong>{confirmBan.username}</strong>?
            </p>
            <div className="modal-btns">
              <button
                className={
                  confirmBan.isBanned
                    ? "btn-confirm-success"
                    : "btn-confirm-danger"
                }
                onClick={() => handleToggleBan(confirmBan._id)}
              >
                Xác nhận
              </button>
              <button
                className="btn-cancel"
                onClick={() => setConfirmBan(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="admin-modal">
          <div className="modal-content item-modal">
            <h3>
              {editingItem._id ? "📝 Sửa vật phẩm" : "✨ Thêm vật phẩm mới"}
            </h3>
            <form onSubmit={handleSaveItem}>
              <div className="form-row">
                <div className="form-group">
                  <label>Tên vật phẩm</label>
                  <input
                    value={editingItem.name}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Hình ảnh (URL)</label>
                  <input
                    value={editingItem.image}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, image: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Giá</label>
                  <input
                    type="number"
                    value={editingItem.price}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        price: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Loại</label>
                  <select
                    value={editingItem.type}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, type: e.target.value })
                    }
                  >
                    <option value="avatar">Ảnh đại diện</option>
                    <option value="gift">Quà tặng</option>
                    <option value="chip-package">Gói Chip</option>
                    <option value="special">Đặc biệt</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Độ hiếm</label>
                  <select
                    value={editingItem.rarity || "common"}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, rarity: e.target.value })
                    }
                  >
                    <option value="common">Thường (Common)</option>
                    <option value="rare">Hiếm (Rare)</option>
                    <option value="epic">Sử thi (Epic)</option>
                    <option value="legendary">Huyền thoại (Legendary)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tỉ lệ bán lại (%)</label>
                  <input
                    type="number"
                    value={
                      editingItem.resellPercentage !== undefined
                        ? editingItem.resellPercentage
                        : 95
                    }
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        resellPercentage: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>Trạng thái</label>
                  <div className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={editingItem.isAvailable}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          isAvailable: e.target.checked,
                        })
                      }
                      id="isAvailable"
                    />
                    <label htmlFor="isAvailable">Đang bán</label>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  value={editingItem.description}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      description: e.target.value,
                    })
                  }
                  rows="3"
                />
              </div>
              <div className="modal-btns">
                <button type="submit" className="btn-confirm-success">
                  Lưu
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setEditingItem(null)}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="admin-modal">
          <div className="modal-content">
            <h3>🗑️ Xác nhận xóa</h3>
            <p>
              Bạn có chắc chắn muốn xóa vật phẩm{" "}
              <strong>{confirmDelete.name}</strong>?
            </p>
            <div className="modal-btns">
              <button
                className="btn-confirm-danger"
                onClick={() => handleDeleteItem(confirmDelete._id)}
              >
                Xóa
              </button>
              <button
                className="btn-cancel"
                onClick={() => setConfirmDelete(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
