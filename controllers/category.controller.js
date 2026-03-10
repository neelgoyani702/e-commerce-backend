import Category from "../models/category.model.js";
import Product from "../models/products.model.js";
import User from "../models/user.model.js";
import fs from "fs";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../services/Cloudinary.service.js";
import { logActivity } from "./admin.controller.js";

const createCategory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { name, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // If parentId provided, validate it exists
    if (parentId) {
      const parentCategory = await Category.findById(parentId);
      if (!parentCategory) {
        return res.status(404).json({ message: "Parent category not found" });
      }
      // Enforce max 2 levels (no sub-sub-categories)
      if (parentCategory.parentId) {
        return res.status(400).json({ message: "Cannot create sub-category under another sub-category. Maximum depth is 2 levels." });
      }
    }

    const categoryImagePath = req.file?.path;

    if (!categoryImagePath) {
      return res.status(400).json({ message: "Category image is required" });
    }

    const categoryImageURL = await uploadOnCloudinary(categoryImagePath);
    if (!categoryImageURL) {
      return res.status(400).json({ message: "Category image upload failed" });
    }

    const category = new Category({
      name: name.trim(),
      image: categoryImageURL.url,
      parentId: parentId || null,
    });

    const savedCategory = await category.save();

    // remove the locally saved temporary file after successful upload
    if (fs.existsSync(categoryImagePath)) {
      fs.unlinkSync(categoryImagePath);
    }

    const label = parentId ? "Sub-category created" : "Category created";
    await logActivity(req.user._id, "category_created", "category", savedCategory._id, savedCategory.name, label);

    res.status(201).json({
      message: `${parentId ? "Sub-category" : "Category"} created successfully`,
      category: savedCategory,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error creating category" });
  }
};

const getCategory = async (req, res) => {
  try {
    const filter = {};

    // Filter by active status
    if (req.query.active === "true") {
      filter.isActive = { $ne: false };
    }

    // Filter by parent: ?parent=null for top-level, ?parent=<id> for sub-categories
    if (req.query.parent === "null" || req.query.parent === "top") {
      filter.parentId = null;
    } else if (req.query.parent) {
      filter.parentId = req.query.parent;
    }

    const categories = await Category.find(filter).populate("parentId", "name");
    res.status(200).json({ message: "Category fetched successfully", categories: categories });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error fetching categories" });
  }
};

const getSubCategories = async (req, res) => {
  try {
    const filter = { parentId: req.params.id };

    if (req.query.active === "true") {
      filter.isActive = { $ne: false };
    }

    const subCategories = await Category.find(filter);
    const parentCategory = await Category.findById(req.params.id).select("name image");

    res.status(200).json({
      message: "Sub-categories fetched successfully",
      subCategories,
      parentCategory,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error fetching sub-categories" });
  }
};

const getCategoryProducts = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).select("-__v").populate("parentId", "name image");

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if this category has sub-categories
    const subCategories = await Category.find({ parentId: req.params.id, isActive: { $ne: false } });

    let products;
    if (subCategories.length > 0) {
      // If it has sub-categories, return products from ALL sub-categories + this category
      const allCategoryIds = [req.params.id, ...subCategories.map(sc => sc._id)];
      products = await Product.find({ category: { $in: allCategoryIds } }).select("-__v");
    } else {
      // No sub-categories, return products directly
      products = await Product.find({ category: req.params.id }).select("-__v");
    }

    return res.status(200).json({
      message: "Category products fetched successfully",
      products: products,
      category: category,
      subCategories: subCategories,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error fetching category products" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Update name if provided
    const { name, isActive, parentId } = req.body;
    if (name && name.trim()) {
      category.name = name.trim();
    }
    if (isActive !== undefined) {
      category.isActive = isActive === true || isActive === "true";
    }
    if (parentId !== undefined) {
      category.parentId = parentId || null;
    }

    // Update image if provided
    const categoryImagePath = req.file?.path;
    if (categoryImagePath) {
      const categoryImageURL = await uploadOnCloudinary(categoryImagePath);

      if (!categoryImageURL) {
        return res.status(400).json({ message: "Category image upload failed" });
      }

      // Delete old image from cloudinary
      if (category.image) {
        await deleteFromCloudinary(category.image);
      }
      category.image = categoryImageURL.url;

      // remove the locally saved temporary file after successful upload
      if (fs.existsSync(categoryImagePath)) {
        fs.unlinkSync(categoryImagePath);
      }
    }

    const updatedCategory = await category.save();

    await logActivity(req.user._id, "category_updated", "category", updatedCategory._id, updatedCategory.name, "Category details updated");

    res.status(200).json({
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error updating category" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const deletedCategory = await Category.findByIdAndDelete(req.params.id);

    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Delete image from cloudinary
    if (deletedCategory.image) {
      await deleteFromCloudinary(deletedCategory.image);
    }

    // Find and delete all sub-categories
    const subCategories = await Category.find({ parentId: req.params.id });
    for (const sub of subCategories) {
      if (sub.image) await deleteFromCloudinary(sub.image);
      // Delete products in sub-category
      await Product.deleteMany({ category: sub._id });
    }
    await Category.deleteMany({ parentId: req.params.id });

    // Also delete all products in this category
    await Product.deleteMany({ category: req.params.id });

    const subCount = subCategories.length;
    const detail = subCount > 0
      ? `Category, ${subCount} sub-categories, and associated products deleted`
      : "Category and associated products deleted";

    await logActivity(req.user._id, "category_deleted", "category", deletedCategory._id, deletedCategory.name, detail);

    res
      .status(200)
      .json({ message: "Category deleted successfully", deletedCategory });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error deleting category" });
  }
};

export { getCategory, createCategory, updateCategory, deleteCategory, getCategoryProducts, getSubCategories };
