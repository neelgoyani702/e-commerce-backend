import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// Migration: Convert old `size` field to `variants` array
// For products that have a `size` string but no variants array

const MONGO_URL = process.env.MONGO_URL;

async function migrate() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const productsCollection = db.collection("products");

  // Find products that have old `size` field but no/empty variants
  const products = await productsCollection.find({
    size: { $exists: true, $ne: null, $ne: "" },
    $or: [
      { variants: { $exists: false } },
      { variants: { $size: 0 } },
    ],
  }).toArray();

  console.log(`Found ${products.length} products with old 'size' field to migrate`);

  let updated = 0;
  for (const product of products) {
    const variant = {
      _id: new mongoose.Types.ObjectId(),
      size: product.size,
      stock: product.stock || 0,
    };

    await productsCollection.updateOne(
      { _id: product._id },
      {
        $set: { variants: [variant] },
        $unset: { size: "" },
      }
    );
    updated++;
    console.log(`  Migrated: "${product.name}" — size "${product.size}" → variant`);
  }

  // Also clean up any remaining `size` fields on products with variants
  const cleanupResult = await productsCollection.updateMany(
    { size: { $exists: true }, variants: { $exists: true, $not: { $size: 0 } } },
    { $unset: { size: "" } }
  );
  if (cleanupResult.modifiedCount > 0) {
    console.log(`Cleaned up 'size' field from ${cleanupResult.modifiedCount} products that already have variants`);
  }

  console.log(`\nMigration complete: ${updated} products migrated`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
