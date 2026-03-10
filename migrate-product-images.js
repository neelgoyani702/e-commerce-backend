/**
 * Migration: populate images array from existing image field for all products.
 * Run: node -r dotenv/config --experimental-json-modules migrate-product-images.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected to database");

  const db = mongoose.connection.db;
  const products = db.collection("products");

  // Find products that have image but no images array (or empty)
  const toUpdate = await products.find({
    image: { $exists: true, $ne: null },
    $or: [
      { images: { $exists: false } },
      { images: { $size: 0 } },
      { images: null },
    ],
  }).toArray();

  let count = 0;
  for (const product of toUpdate) {
    await products.updateOne(
      { _id: product._id },
      { $set: { images: [product.image] } }
    );
    count++;
  }

  console.log(`✅ Migrated ${count} products (populated images array from image field)`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
