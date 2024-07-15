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
      required: true,
    },
    size: {
      type: String,
    },
  },

  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
