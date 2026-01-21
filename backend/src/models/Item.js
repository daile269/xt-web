const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: ["avatar", "gift", "chip-package", "special"],
      required: true,
    },
    image: String,
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    realMoneyPrice: {
      type: Number, // VND
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isTradeable: {
      type: Boolean,
      default: true,
    },
    stock: {
      type: Number,
      default: -1, // -1 means unlimited
    },
    resellPercentage: {
      type: Number,
      default: 95, // 95% of original price
    },
    rarity: {
      type: String,
      enum: ["common", "rare", "epic", "legendary"],
      default: "common",
    },
    effects: {
      coinBonus: { type: Number, default: 0 },
      coinMultiplier: { type: Number, default: 1 },
      specialAbility: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Item", itemSchema);
