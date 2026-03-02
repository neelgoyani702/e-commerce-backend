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

    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
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
    });

    const savedCategory = await category.save();

    // remove the locally saved temporary file after successful upload
    if (fs.existsSync(categoryImagePath)) {
      fs.unlinkSync(categoryImagePath);
    }

    await logActivity(req.user._id, "category_created", "category", savedCategory._id, savedCategory.name, "Category created");

    res.status(201).json({
      message: "Category created successfully",
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
    if (req.query.active === "true") {
      // Use $ne: false to include documents where isActive doesn't exist (old data)
      filter.isActive = { $ne: false };
    }
    const categories = await Category.find(filter);
    res.status(200).json({ message: "Category fetched successfully", categories: categories });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error fetching categories" });
  }
};

const getCategoryProducts = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).select("-__v");

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const products = await Product.find({ category: req.params.id }).select("-__v");

    return res.status(200).json({
      message: "Category products fetched successfully",
      products: products,
      category: category,
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
    const { name, isActive } = req.body;
    if (name && name.trim()) {
      category.name = name.trim();
    }
    if (isActive !== undefined) {
      category.isActive = isActive === true || isActive === "true";
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

    // Also delete all products in this category
    await Product.deleteMany({ category: req.params.id });

    await logActivity(req.user._id, "category_deleted", "category", deletedCategory._id, deletedCategory.name, "Category and associated products deleted");

    res
      .status(200)
      .json({ message: "Category deleted successfully", deletedCategory });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error deleting category" });
  }
};

export { getCategory, createCategory, updateCategory, deleteCategory, getCategoryProducts };
