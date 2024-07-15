import Product from "../models/products.model.js";
import Category from "../models/category.model.js";
import User from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../services/Cloudinary.service.js";

const createProduct = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(404).json({ message: "User have no admin access" });
    }

    let { name, description, price, category, bulletPoints, size } = req.body;

    category = category.toLowerCase();

    const categoryExist = await Category.findOne({ name: category });

    if (!categoryExist) {
      return res.status(404).json({ message: "Category not found" });
    }

    const productImagePath = req.file?.path;
    if (!productImagePath) {
      return res.status(400).json({ message: "product image is required" });
    }

    const productImageURL = await uploadOnCloudinary(productImagePath);

    if (!productImageURL) {
      return res.status(400).json({ message: "products image upload failed" });
    }

    const product = new Product({
      name,
      description,
      price,
      category: categoryExist._id,
      bulletPoints,
      image: productImageURL.url,
      size,
    });

    const savedProduct = await product.save();

    res.status(201).json({
      message: "Product created successfully",
      product: savedProduct,
      category: categoryExist,
    });
  } catch (error) {
    res
      .status(400)
      .json({ error: error.message, message: "error in create product" });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name")
      .select("-__v");

    if (!products) {
      return res.status(404).json({ message: "Products not found" });
    }

    res
      .status(200)
      .json({ message: "All products fetched successfully", products });
  } catch (error) {
    res
      .status(400)
      .json({ error: error.message, message: "error in get products" });
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
      .status(400)
      .json({ error: error.message, message: "error in get product by id" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(404).json({ message: "User have no admin access" });
    }

    let { name, description, price, bulletPoints, size } = req.body;
    const productImagePath = req.file?.path;

    const product = await Product.findById(req.params.id)
      .populate("category", "name")
      .select("-__v");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (productImagePath) {
      const productImageURL = await uploadOnCloudinary(productImagePath);

      if (!productImageURL) {
        return res
          .status(400)
          .json({ message: "products image upload failed" });
      }

      await deleteFromCloudinary(product.image);

      product.image = productImageURL.url;
    }

    product.name = name ? name : product.name;
    product.description = description ? description : product.description;
    product.price = price ? price : product.price;
    product.bulletPoints = bulletPoints ? bulletPoints : product.bulletPoints;
    product.size = size ? size : product.size;

    const updatedProduct = await product.save();

    return res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "error in update product" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(404).json({ message: "User have no admin access" });
    }

    const product = await Product.findByIdAndDelete(req.params.id)
      .populate("category", "name")
      .select("-__v");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await deleteFromCloudinary(product.image);

    return res.status(200).json({
      message: "Product deleted successfully",
      product,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ error: error.message, message: "error in delete product" });
  }
};

export {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
