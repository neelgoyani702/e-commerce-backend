import mongoose from "mongoose";

const paymentDetailsSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
    Amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const PaymentDetails = mongoose.model("PaymentDetails", paymentDetailsSchema);

export default PaymentDetails;
