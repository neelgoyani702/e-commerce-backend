import Category from "../models/category.model.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../services/Cloudinary.service.js";
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

const getCategory = async (req, res) => {};

const updateCategory = async (req, res) => {};

const deleteCategory = async (req, res) => {};

export { getCategory, createCategory, updateCategory, deleteCategory };
