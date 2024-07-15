import Category from "../models/category.model.js";
import User from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../services/Cloudinary.service.js";
import fs from "fs";

const createCategory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(404).json({ message: "User have no admin access" });
    }

    const { name } = req.body;
    const categoryImagePath = req.file?.path;

    if (!categoryImagePath) {
      return res.status(400).json({ message: "Category image is required" });
    }

    const categoryImageURL = await uploadOnCloudinary(categoryImagePath);
    if (!categoryImageURL) {
      return res.status(400).json({ message: "Category image upload failed" });
    }

    const category = new Category({
      name,
      image: categoryImageURL.url,
    });

    const savedCategory = await category.save();
    console.log("savedCategroy", savedCategory);

    // remove the locally saved temperary file as the upload on operation got successfull
    fs.unlinkSync(categoryImagePath);

    res.status(201).json({
      message: "Category created successfully",
      category: savedCategory,
    });
  } catch (error) {
    res
      .status(400)
      .json({ error: error.messag, message: "error in create category" });
  }
};

const getCategory = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json({ categories });
  } catch (error) {
    res
      .status(400)
      .json({ error: error.message, message: "error in get category" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(404).json({ message: "User have no admin access" });
    }

    const categoryImagePath = req.file?.path;

    if (!categoryImagePath) {
      return res.status(400).json({ message: "Category image is required" });
    }

    const categoryImageURL = await uploadOnCloudinary(categoryImagePath);

    if (!categoryImageURL) {
      return res.status(400).json({ message: "Category image upload failed" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    await deleteFromCloudinary(category.image);
    category.image = categoryImageURL.url;

    const updatedCategory = await category.save();

    // remove the locally saved temperary file as the upload on operation got successfull
    fs.unlinkSync(categoryImagePath);

    res.status(200).json({
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    res
      .status(400)
      .json({ error: error.message, message: "error in update category" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(404).json({ message: "User have no admin access" });
    }

    // const category = await Category.findById(req.params.id);
    // if (!category) {
    //   return res.status(404).json({ message: "Category not found" });
    // }

    // await deleteFromCloudinary(category.image);
    // await category.delete();

    const deletedCategory = await Category.findByIdAndDelete(req.params.id);

    await deleteFromCloudinary(deletedCategory.image);

    res
      .status(200)
      .json({ message: "Category deleted successfully", deletedCategory });
  } catch (error) {
    res
      .status(400)
      .json({ error: error.message, message: "error in delete category" });
  }
};

export { getCategory, createCategory, updateCategory, deleteCategory };
