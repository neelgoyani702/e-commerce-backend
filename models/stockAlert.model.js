import mongoose from "mongoose";

const stockAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    email: {
      type: String,
      required: true,
    },
    notified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// One alert per user per product per variant
stockAlertSchema.index({ userId: 1, productId: 1, variantId: 1 }, { unique: true });

const StockAlert = mongoose.model("StockAlert", stockAlertSchema);

export default StockAlert;
