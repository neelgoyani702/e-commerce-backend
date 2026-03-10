import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    bulletPoints: [{ type: String }],
    image: {
      type: String,
    },
    images: [{
      type: String,
    }],
    variants: [{
      size: { type: String },
      color: { type: String },
      colorCode: { type: String },
      stock: { type: Number, default: 0 },
      priceOverride: { type: Number, default: null },
      sku: { type: String },
    }],
    stock: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },

  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
