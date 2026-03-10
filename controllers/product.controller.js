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

// Parse variants from FormData (JSON string or array)
function parseVariants(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
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

    let { name, description, price, category, bulletPoints, variants, stock, discount, featured } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }

    if (!price || isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ message: "Valid price is required" });
    }

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    // Support both category ID and category name
    let categoryExist;
    if (category.match(/^[0-9a-fA-F]{24}$/)) {
      categoryExist = await Category.findById(category);
    } else {
      category = category.toLowerCase();
      categoryExist = await Category.findOne({ name: category });
    }

    if (!categoryExist) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Handle multiple image uploads
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: "At least one product image is required" });
    }

    const imageUrls = [];
    for (const file of files) {
      const uploadResult = await uploadOnCloudinary(file.path);
      if (uploadResult && uploadResult.url) {
        imageUrls.push(uploadResult.url);
      }
      // Clean up temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    if (imageUrls.length === 0) {
      return res.status(400).json({ message: "Product image upload failed" });
    }

    // Parse variants
    const parsedVariants = parseVariants(variants);

    // Auto-calculate stock from variants if they exist
    let totalStock = stock ? Number(stock) : 0;
    if (parsedVariants.length > 0) {
      totalStock = parsedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    }

    const product = new Product({
      name: name.trim(),
      description: description?.trim(),
      price: Number(price),
      category: categoryExist._id,
      bulletPoints: parseBulletPoints(bulletPoints),
      image: imageUrls[0],
      images: imageUrls,
      variants: parsedVariants.map(v => ({
        size: v.size || undefined,
        color: v.color || undefined,
        colorCode: v.colorCode || undefined,
        stock: Number(v.stock) || 0,
        priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
        sku: v.sku || undefined,
      })),
      stock: totalStock,
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

    let { name, description, price, category, bulletPoints, variants, stock, discount, featured, removeImages } = req.body;
    const files = req.files || [];

    const product = await Product.findById(req.params.id)
      .populate("category", "name")
      .select("-__v");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Ensure images array is populated (backward compat for old products)
    if (!product.images || product.images.length === 0) {
      product.images = product.image ? [product.image] : [];
    }

    // Remove specific images if requested
    if (removeImages) {
      const toRemove = typeof removeImages === "string" ? JSON.parse(removeImages) : removeImages;
      for (const imgUrl of toRemove) {
        await deleteFromCloudinary(imgUrl);
        product.images = product.images.filter((img) => img !== imgUrl);
      }
    }

    // Upload new images if provided
    if (files.length > 0) {
      for (const file of files) {
        const uploadResult = await uploadOnCloudinary(file.path);
        if (uploadResult && uploadResult.url) {
          product.images.push(uploadResult.url);
        }
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    // Update the primary image to the first in the array
    product.image = product.images.length > 0 ? product.images[0] : product.image;

    // Update fields if provided
    if (name && name.trim()) product.name = name.trim();
    if (description !== undefined) product.description = description.trim();
    if (price && !isNaN(price) && Number(price) > 0) product.price = Number(price);
    if (bulletPoints) product.bulletPoints = parseBulletPoints(bulletPoints);
    if (discount !== undefined) product.discount = Number(discount);
    if (featured !== undefined) product.featured = featured === true || featured === "true";

    // Handle variants update
    if (variants !== undefined) {
      const parsedVariants = parseVariants(variants);
      product.variants = parsedVariants.map(v => ({
        size: v.size || undefined,
        color: v.color || undefined,
        colorCode: v.colorCode || undefined,
        stock: Number(v.stock) || 0,
        priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
        sku: v.sku || undefined,
      }));
      // Auto-calculate total stock from variants
      if (parsedVariants.length > 0) {
        product.stock = parsedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      } else if (stock !== undefined) {
        product.stock = Number(stock);
      }
    } else if (stock !== undefined) {
      product.stock = Number(stock);
    }

    // Update category if provided (supports both ID and name)
    if (category) {
      let categoryExist;
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        categoryExist = await Category.findById(category);
      } else {
        categoryExist = await Category.findOne({ name: category.toLowerCase() });
      }
      if (categoryExist) {
        product.category = categoryExist._id;
      }
    }

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

    // Delete all images from cloudinary
    const allImages = product.images?.length > 0 ? product.images : (product.image ? [product.image] : []);
    for (const imgUrl of allImages) {
      await deleteFromCloudinary(imgUrl);
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
