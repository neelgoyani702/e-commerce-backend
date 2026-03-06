import Product from "../models/products.model.js";
import Category from "../models/category.model.js";
import User from "../models/user.model.js";
import Review from "../models/review.model.js";
import fs from "fs";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../services/Cloudinary.service.js";
import { logActivity } from "./admin.controller.js";

// Normalize bulletPoints from FormData — handles JSON strings, arrays, double-encoded, etc.
function parseBulletPoints(bp) {
  if (!bp) return [];
  // Already a proper array of strings
  if (Array.isArray(bp)) {
    // Each element might be a JSON string itself (double-encoded)
    return bp.flatMap(item => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        // Check if this string is a JSON array (double-encoded)
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
          } catch { /* not valid JSON, treat as plain string */ }
        }
        // Check if comma-separated
        if (trimmed.includes(',') && !trimmed.includes('"')) {
          return trimmed.split(',').map(s => s.trim()).filter(Boolean);
        }
        return trimmed ? [trimmed] : [];
      }
      return [String(item)];
    }).filter(Boolean);
  }
  // It's a string — try parsing as JSON first
  if (typeof bp === 'string') {
    const trimmed = bp.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parseBulletPoints(parsed); // recurse to handle double-encoding
      } catch { /* not valid JSON */ }
    }
    // Comma-separated fallback
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

const createProduct = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    let { name, description, price, category, bulletPoints, size, stock, discount, featured } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }

    if (!price || isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ message: "Valid price is required" });
    }

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    category = category.toLowerCase();
    const categoryExist = await Category.findOne({ name: category });

    if (!categoryExist) {
      return res.status(404).json({ message: "Category not found" });
    }

    const productImagePath = req.file?.path;
    if (!productImagePath) {
      return res.status(400).json({ message: "Product image is required" });
    }

    const productImageURL = await uploadOnCloudinary(productImagePath);

    if (!productImageURL) {
      return res.status(400).json({ message: "Product image upload failed" });
    }

    // Clean up temp file
    if (fs.existsSync(productImagePath)) {
      fs.unlinkSync(productImagePath);
    }

    const product = new Product({
      name: name.trim(),
      description: description?.trim(),
      price: Number(price),
      category: categoryExist._id,
      bulletPoints: parseBulletPoints(bulletPoints),
      image: productImageURL.url,
      size,
      stock: stock ? Number(stock) : 0,
      discount: discount ? Number(discount) : 0,
      featured: featured === true || featured === "true",
    });

    const savedProduct = await product.save();

    await logActivity(req.user._id, "product_created", "product", savedProduct._id, savedProduct.name, `Price: ₹${savedProduct.price}`);

    res.status(201).json({
      message: "Product created successfully",
      product: savedProduct,
      category: categoryExist,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error creating product" });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name")
      .select("-__v");

    // Aggregate review stats for all products
    const reviewStats = await Review.aggregate([
      {
        $group: {
          _id: "$productId",
          avgRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const statsMap = {};
    reviewStats.forEach((s) => {
      statsMap[s._id.toString()] = { avgRating: s.avgRating, reviewCount: s.reviewCount };
    });

    const productsWithRatings = products.map((p) => {
      const obj = p.toObject();
      const stats = statsMap[p._id.toString()];
      obj.avgRating = stats ? Math.round(stats.avgRating * 10) / 10 : 0;
      obj.reviewCount = stats ? stats.reviewCount : 0;
      return obj;
    });

    res
      .status(200)
      .json({ message: "All products fetched successfully", products: productsWithRatings });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error fetching products" });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name")
      .select("-__v");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product fetched successfully", product });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error fetching product" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    let { name, description, price, bulletPoints, size, stock, discount, featured } = req.body;
    const productImagePath = req.file?.path;

    const product = await Product.findById(req.params.id)
      .populate("category", "name")
      .select("-__v");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update image if provided
    if (productImagePath) {
      const productImageURL = await uploadOnCloudinary(productImagePath);

      if (!productImageURL) {
        return res
          .status(400)
          .json({ message: "Product image upload failed" });
      }

      // Delete old image
      if (product.image) {
        await deleteFromCloudinary(product.image);
      }

      product.image = productImageURL.url;

      // Clean up temp file
      if (fs.existsSync(productImagePath)) {
        fs.unlinkSync(productImagePath);
      }
    }

    // Update fields if provided
    if (name && name.trim()) product.name = name.trim();
    if (description !== undefined) product.description = description.trim();
    if (price && !isNaN(price) && Number(price) > 0) product.price = Number(price);
    if (bulletPoints) product.bulletPoints = parseBulletPoints(bulletPoints);
    if (size) product.size = size;
    if (stock !== undefined) product.stock = Number(stock);
    if (discount !== undefined) product.discount = Number(discount);
    if (featured !== undefined) product.featured = featured === true || featured === "true";

    const updatedProduct = await product.save();

    await logActivity(req.user._id, "product_updated", "product", updatedProduct._id, updatedProduct.name, "Product details updated");

    return res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error updating product" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const product = await Product.findByIdAndDelete(req.params.id)
      .populate("category", "name")
      .select("-__v");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete image from cloudinary
    if (product.image) {
      await deleteFromCloudinary(product.image);
    }

    await logActivity(req.user._id, "product_deleted", "product", product._id, product.name, "Product deleted");

    return res.status(200).json({
      message: "Product deleted successfully",
      product,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error deleting product" });
  }
};

const getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select("category");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
    })
      .populate("category", "name")
      .select("-__v")
      .limit(4);

    res.status(200).json({
      message: "Related products fetched successfully",
      products: relatedProducts,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error fetching related products" });
  }
};

const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(200).json({ products: [], categories: [] });
    }

    const searchRegex = new RegExp(q.trim(), "i");

    const [products, categories] = await Promise.all([
      Product.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
        ],
      })
        .populate("category", "name")
        .select("name price image discount category stock")
        .limit(8),
      Category.find({ name: searchRegex, isActive: true })
        .select("name image")
        .limit(4),
    ]);

    res.status(200).json({
      message: "Search results fetched",
      products: products || [],
      categories: categories || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Search failed" });
  }
};

export {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getRelatedProducts,
  searchProducts,
};
