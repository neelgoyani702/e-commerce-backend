import mongoose from "mongoose";

const flashSaleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        salePrice: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
  },
  { timestamps: true }
);

// Virtual for checking if flash sale is currently active
flashSaleSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
});

// Configure schema to include virtuals when converting to JSON
flashSaleSchema.set("toJSON", { virtuals: true });
flashSaleSchema.set("toObject", { virtuals: true });

const FlashSale = mongoose.model("FlashSale", flashSaleSchema);

export default FlashSale;
