import React, { useState, useEffect, useCallback } from "react";
import { shopAPI } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { toast } from "react-toastify";
import "./Inventory.css";

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellingItem, setSellingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, updateUser } = useAuthStore();

  const rarityMap = {
    common: "Thường",
    rare: "Hiếm",
    epic: "Sử thi",
    legendary: "Huyền thoại",
  };

  const typeMap = {
    avatar: "Ảnh đại diện",
    gift: "Quà tặng",
    "chip-package": "Gói Chip",
    special: "Đặc biệt",
  };

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shopAPI.getInventory();
      setInventory(res.data.inventory);
    } catch (error) {
      toast.error("Lỗi khi tải kho đồ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSellConfirm = async () => {
    if (!sellingItem) return;
    setIsSubmitting(true);
    try {
      const res = await shopAPI.sellItem({ itemId: sellingItem.itemId._id });
      if (res.data.success) {
        toast.success(res.data.message);
        updateUser({ coins: res.data.remainingCoins });
        setSellingItem(null);
        fetchInventory();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi bán vật phẩm");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && inventory.length === 0) {
    return (
      <div className="inventory-container">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Đang tải kho đồ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-container">
      <header className="inventory-header">
        <div className="header-title">
          <h1>
            🎒 <span>Kho Đồ Của Bạn</span>
          </h1>
          <p>Quản lý các vật phẩm bạn đang sở hữu</p>
        </div>
        <div className="inventory-balance">
          <span>🪙 Số dư:</span>
          <span>{user?.coins?.toLocaleString()}</span>
        </div>
      </header>

      <div className="inventory-content">
        {inventory.length > 0 ? (
          <div className="items-grid">
            {inventory.map((item) => (
              <div key={item._id} className="item-card">
                <span className={`item-rarity ${item.itemId.rarity}`}>
                  {rarityMap[item.itemId.rarity] || item.itemId.rarity}
                </span>
                <div className="item-image-box">
                  <img src={item.itemId.image} alt={item.itemId.name} />
                  {item.quantity > 1 && (
                    <span className="item-quantity">x{item.quantity}</span>
                  )}
                </div>
                <div className="item-info">
                  <h3>{item.itemId.name}</h3>
                  <p className="item-type-label">
                    {typeMap[item.itemId.type] || item.itemId.type}
                  </p>
                  <div className="item-footer">
                    <div className="resale-info">
                      <span className="label">Giá bán:</span>
                      <span className="item-price resale">
                        🪙{" "}
                        {Math.floor(
                          (item.itemId.price *
                            (item.itemId.resellPercentage || 95)) /
                            100,
                        ).toLocaleString()}
                      </span>
                    </div>
                    <button
                      className="btn-sell"
                      onClick={() => setSellingItem(item)}
                    >
                      Bán
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-items-large">
            <div className="no-items-icon">🎒</div>
            <h3>Kho đồ trống</h3>
            <p>Bạn chưa sở hữu vật phẩm nào. Hãy ghé thăm cửa hàng nhé!</p>
            <button
              className="btn-shop-redirect"
              onClick={() => (window.location.href = "/shop")}
            >
              Đến Cửa Hàng
            </button>
          </div>
        )}
      </div>

      {sellingItem && (
        <div className="inventory-modal">
          <div className="modal-content">
            <h3>Xác nhận bán</h3>
            <div className="modal-item-preview">
              <img
                src={sellingItem.itemId.image}
                alt=""
                className="modal-item-img"
              />
              <div className="modal-item-details">
                <h4>{sellingItem.itemId.name}</h4>
                <span className={`rarity-badge ${sellingItem.itemId.rarity}`}>
                  {rarityMap[sellingItem.itemId.rarity]}
                </span>
              </div>
            </div>
            <p className="confirm-text">
              Bạn có chắc chắn muốn bán vật phẩm này không?
            </p>
            <div className="sell-price-box">
              <span>Số tiền nhận lại:</span>
              <span className="total-price">
                🪙{" "}
                {Math.floor(
                  (sellingItem.itemId.price *
                    (sellingItem.itemId.resellPercentage || 95)) /
                    100,
                ).toLocaleString()}
              </span>
            </div>
            <div className="modal-btns">
              <button
                className="btn-confirm btn-sell-confirm"
                onClick={handleSellConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang bán..." : "Xác nhận bán"}
              </button>
              <button
                className="btn-cancel"
                onClick={() => setSellingItem(null)}
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

export default Inventory;
