import Product from "../models/products.model.js";
import Category from "../models/category.model.js";
import csvParser from "csv-parser";
import { Readable } from "stream";

// ── CSV Export ──────────────────────────────────────────────
export const exportProductsCsv = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name")
      .lean();

    const headers = [
      "name", "price", "description", "category", "stock",
      "discount", "featured", "image", "bulletPoints"
    ];

    let csv = headers.join(",") + "\n";

    for (const p of products) {
      const row = [
        `"${(p.name || "").replace(/"/g, '""')}"`,
        p.price || 0,
        `"${(p.description || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
        `"${p.category?.name || ""}"`,
        p.stock || 0,
        p.discount || 0,
        p.featured ? "true" : "false",
        `"${p.image || ""}"`,
        `"${(p.bulletPoints || []).join(" | ")}"`,
      ];
      csv += row.join(",") + "\n";
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products_export.csv");
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error exporting products" });
  }
};

// ── CSV Import ──────────────────────────────────────────────
export const importProductsCsv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No CSV file uploaded" });
    }

    const results = [];
    const errors = [];

    // Parse CSV from buffer
    await new Promise((resolve, reject) => {
      const stream = Readable.from(req.file.buffer);
      stream
        .pipe(csvParser())
        .on("data", (row) => results.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    if (results.length === 0) {
      return res.status(400).json({ message: "CSV file is empty" });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowNum = i + 2; // +2 for 1-indexed + header row

      try {
        const name = row.name?.trim();
        if (!name) {
          errors.push(`Row ${rowNum}: Missing product name, skipped`);
          skipped++;
          continue;
        }

        const price = parseFloat(row.price);
        if (isNaN(price) || price <= 0) {
          errors.push(`Row ${rowNum} (${name}): Invalid price, skipped`);
          skipped++;
          continue;
        }

        // Resolve category by name
        let categoryId = null;
        const categoryName = row.category?.trim();
        if (categoryName) {
          let cat = await Category.findOne({
            name: { $regex: new RegExp(`^${categoryName}$`, "i") },
          });
          if (!cat) {
            cat = await Category.create({ name: categoryName });
          }
          categoryId = cat._id;
        }

        const productData = {
          name,
          price,
          description: row.description?.trim() || name,
          category: categoryId,
          stock: parseInt(row.stock) || 0,
          discount: parseFloat(row.discount) || 0,
          featured: row.featured?.toLowerCase() === "true",
          image: row.image?.trim() || "",
          bulletPoints: row.bulletPoints
            ? row.bulletPoints.split("|").map((b) => b.trim()).filter(Boolean)
            : [],
        };

        // Check if product with same name exists → update, else create
        const existing = await Product.findOne({
          name: { $regex: new RegExp(`^${name}$`, "i") },
        });

        if (existing) {
          await Product.findByIdAndUpdate(existing._id, productData);
          updated++;
        } else {
          await Product.create(productData);
          created++;
        }
      } catch (rowErr) {
        errors.push(`Row ${rowNum}: ${rowErr.message}`);
        skipped++;
      }
    }

    return res.status(200).json({
      message: "CSV import completed",
      summary: { total: results.length, created, updated, skipped },
      errors: errors.slice(0, 20), // Cap error list at 20
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error importing products" });
  }
};
