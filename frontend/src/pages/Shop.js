import React, { useState, useEffect, useCallback } from "react";
import { shopAPI } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { toast } from "react-toastify";
import "./Shop.css";

const Shop = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [buyingItem, setBuyingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, updateUser } = useAuthStore();

  const rarityMap = {
    common: "Thường",
    rare: "Hiếm",
    epic: "Sử thi",
    legendary: "Huyền thoại",
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeTab === "all" ? {} : { type: activeTab };
      const res = await shopAPI.getItems(params);
      setItems(res.data.items);
    } catch (error) {
      toast.error("Lỗi khi tải vật phẩm");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleBuy = async () => {
    if (!buyingItem) return;
    setIsSubmitting(true);
    try {
      const res = await shopAPI.buyItem({ itemId: buyingItem._id });
      if (res.data.success) {
        toast.success(res.data.message);
        updateUser({ coins: res.data.remainingCoins });
        setBuyingItem(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi mua vật phẩm");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: "all", label: "Tất Cả", icon: "🏪" },
    { id: "avatar", label: "Ảnh Đại Diện", icon: "👤" },
    { id: "gift", label: "Quà Tặng", icon: "🎁" },
    { id: "chip-package", label: "Gói Chip", icon: "🪙" },
    { id: "special", label: "Đặc Biệt", icon: "✨" },
  ];

  if (loading && items.length === 0) {
    return (
      <div className="shop-container">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Đang tải cửa hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-container">
      <header className="shop-header">
        <h1>Cửa Hàng Vật Phẩm</h1>
        <div className="shop-balance">
          <span>🪙 Số dư:</span>
          <span>{user?.coins?.toLocaleString()}</span>
        </div>
      </header>

      <div className="shop-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`shop-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="items-grid">
        {items.map((item) => (
          <div key={item._id} className="item-card">
            <span className={`item-rarity ${item.rarity}`}>
              {rarityMap[item.rarity] || item.rarity}
            </span>
            <div className="item-image-box">
              <img src={item.image} alt={item.name} />
            </div>
            <div className="item-info">
              <h3>{item.name}</h3>
              <p className="item-desc">
                {item.description || "Không có mô tả cho vật phẩm này."}
              </p>
              <div className="item-footer">
                <span className="item-price">
                  🪙 {item.price.toLocaleString()}
                </span>
                <button
                  className="btn-buy"
                  onClick={() => setBuyingItem(item)}
                  disabled={user?.coins < item.price}
                >
                  {user?.coins < item.price ? "Thiếu tiền" : "Mua ngay"}
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="no-items">
            <p>Hiện không có vật phẩm nào trong mục này.</p>
          </div>
        )}
      </div>

      {buyingItem && (
        <div className="shop-modal">
          <div className="modal-content">
            <h3>Xác nhận mua</h3>
            <img src={buyingItem.image} alt="" className="modal-item-img" />
            <p>
              Bạn có chắc chắn muốn mua <strong>{buyingItem.name}</strong> với
              giá 🪙 <strong>{buyingItem.price.toLocaleString()}</strong>?
            </p>
            <div className="modal-btns">
              <button
                className="btn-confirm"
                onClick={handleBuy}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang giao dịch..." : "Xác nhận"}
              </button>
              <button
                className="btn-cancel"
                onClick={() => setBuyingItem(null)}
                disabled={isSubmitting}
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

export default Shop;
