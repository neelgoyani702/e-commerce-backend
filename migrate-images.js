/**
 * Migration script: Update all Cloudinary image URLs to include the e_commerce folder.
 * 
 * Old format: .../upload/v1234567890/filename.jpg
 * New format: .../upload/v1234567890/e_commerce/filename.jpg
 * 
 * Run: node -r dotenv/config migrate-images.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function migrate() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to database");

  const db = mongoose.connection.db;

  // Regex: match Cloudinary URLs that do NOT already have /e_commerce/ in path
  // Captures: (everything up to /upload/v<numbers>/) + (filename.ext)
  const regex = /^(https?:\/\/res\.cloudinary\.com\/.*\/upload\/v\d+)\/((?!e_commerce\/).+)$/;

  let totalUpdated = 0;

  // 1. Update Products (image field)
  const products = db.collection("products");
  const allProducts = await products.find({ image: { $regex: "res.cloudinary.com" } }).toArray();
  let productCount = 0;
  for (const product of allProducts) {
    if (product.image && regex.test(product.image)) {
      const newUrl = product.image.replace(regex, "$1/e_commerce/$2");
      await products.updateOne({ _id: product._id }, { $set: { image: newUrl } });
      productCount++;
    }
  }
  console.log(`✅ Products: ${productCount} image URLs updated`);
  totalUpdated += productCount;

  // 2. Update Categories (image field)
  const categories = db.collection("categories");
  const allCategories = await categories.find({ image: { $regex: "res.cloudinary.com" } }).toArray();
  let categoryCount = 0;
  for (const cat of allCategories) {
    if (cat.image && regex.test(cat.image)) {
      const newUrl = cat.image.replace(regex, "$1/e_commerce/$2");
      await categories.updateOne({ _id: cat._id }, { $set: { image: newUrl } });
      categoryCount++;
    }
  }
  console.log(`✅ Categories: ${categoryCount} image URLs updated`);
  totalUpdated += categoryCount;

  // 3. Update Users (image field) — only if it's a custom Cloudinary upload, skip default avatar
  const users = db.collection("users");
  const allUsers = await users.find({ image: { $regex: "res.cloudinary.com" } }).toArray();
  let userCount = 0;
  for (const user of allUsers) {
    if (user.image && regex.test(user.image)) {
      const newUrl = user.image.replace(regex, "$1/e_commerce/$2");
      await users.updateOne({ _id: user._id }, { $set: { image: newUrl } });
      userCount++;
    }
  }
  console.log(`✅ Users: ${userCount} image URLs updated`);
  totalUpdated += userCount;

  console.log(`\n🎉 Migration complete! Total URLs updated: ${totalUpdated}`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
