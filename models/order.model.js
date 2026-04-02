import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "order placed",
        "confirmed",
        "packed",
        "shipped",
        "out for delivery",
        "delivered",
        "cancelled",
      ],
      default: "order placed",
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],
    estimatedDelivery: {
      type: Date,
      default: null,
    },
    subTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    regularDiscount: {
      type: Number,
      default: 0,
    },
    flashSaleDiscount: {
      type: Number,
      default: 0,
    },
    bundleDiscount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    totalItems: {
      type: Number,
      required: true,
    },
    couponCode: {
      type: String,
      default: null,
    },
    couponDiscount: {
      type: Number,
      default: 0,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        variantLabel: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
