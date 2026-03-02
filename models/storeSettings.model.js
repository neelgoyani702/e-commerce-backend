import mongoose from "mongoose";

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: "ShopKart",
    },
    tagline: {
      type: String,
      default: "Premium Shopping",
    },
    currency: {
      type: String,
      default: "INR",
    },
    currencySymbol: {
      type: String,
      default: "₹",
    },
    primaryColor: {
      type: String,
      default: "#4f46e5",
    },
    accentColor: {
      type: String,
      default: "#7c3aed",
    },
    contactEmail: {
      type: String,
      default: "",
    },
    contactPhone: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    socialLinks: {
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
      facebook: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

const StoreSettings = mongoose.model("StoreSettings", storeSettingsSchema);

export default StoreSettings;
