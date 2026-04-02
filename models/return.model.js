import mongoose from "mongoose";

const returnSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      enum: [
        "Damaged product",
        "Wrong item received",
        "Item not as described",
        "Quality not satisfactory",
        "Size/fit issue",
        "Changed my mind",
        "Other",
      ],
    },
    reasonDetail: {
      type: String,
      default: "",
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        variantLabel: {
          type: String,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "refunded"],
      default: "pending",
    },
    adminNote: {
      type: String,
      default: "",
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Return = mongoose.model("Return", returnSchema);

export default Return;
