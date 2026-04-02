import mongoose from "mongoose";

const bundleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mainProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // The accessory/additional items that complete the bundle
    additionalProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
    ],
    // Discount percentage applied to the grouped items when bought together
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 10,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Bundle = mongoose.model("Bundle", bundleSchema);
export default Bundle;
