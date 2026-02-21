import Cart from "../models/cart.model.js";
import Product from "../models/products.model.js";

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate({
      path: "products.productId",
      select: "name price image",
    });

    if (!cart) {
      return res.status(200).json({ message: "Cart is empty", cart: { products: [], totalAmount: 0, totalItems: 0 } });
    }

    return res.status(200).json({ message: "Cart fetched successfully", cart });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error fetching cart" });
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, ATC } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ message: "Product ID is required" });
    }

    if (quantity <= 0) {
      return res
        .status(400)
        .json({ message: "Quantity must be greater than 0" });
    }

    const productDoc = await Product.findById(productId);
    if (!productDoc) {
      return res.status(404).json({ message: "Product not found" });
    }

    const unitPrice = productDoc.price;
    const linePrice = unitPrice * Number(quantity);
    const cart = await Cart.findOne({ userId: req.user._id });

    if (cart) {
      // Cart already exists for the user
      const existingItem = cart.products.find(
        (p) => p.productId.toString() === productId
      );

      if (existingItem) {
        // Product already exists in the cart
        if (ATC) {
          // Add To Cart mode: increment quantity
          existingItem.quantity = existingItem.quantity + Number(quantity);
          existingItem.price = existingItem.quantity * unitPrice;
        } else {
          // Update mode: set exact quantity
          existingItem.quantity = Number(quantity);
          existingItem.price = Number(quantity) * unitPrice;
        }
      } else {
        // Product does not exist in cart — add it
        cart.products.push({ productId, quantity: Number(quantity), price: linePrice });
      }

      // Recalculate totals
      cart.totalAmount = cart.products.reduce((acc, p) => acc + p.price, 0);
      cart.totalItems = cart.products.length;

      await cart.save();
      return res.status(201).json({ message: "Product added to cart", cart });
    }

    // Cart does not exist — create new one
    const newCart = await Cart.create({
      userId: req.user._id,
      products: [{ productId, quantity: Number(quantity), price: linePrice }],
      totalAmount: linePrice,
      totalItems: 1,
    });

    return res
      .status(201)
      .json({ message: "Product added to cart", cart: newCart });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Error adding to cart" });
  }
};

const updateCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const existingItem = cart.products.find(
      (p) => p.productId.toString() === productId
    );

    if (!existingItem) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    const productDoc = await Product.findById(productId);
    if (!productDoc) {
      return res.status(404).json({ message: "Product no longer exists" });
    }

    existingItem.quantity = Number(quantity);
    existingItem.price = Number(quantity) * productDoc.price;

    // Recalculate totals
    cart.totalAmount = cart.products.reduce((acc, p) => acc + p.price, 0);
    cart.totalItems = cart.products.length;

    await cart.save();

    return res.status(200).json({ message: "Cart updated successfully", cart });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error updating cart" });
  }
};

const deleteCart = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const product = cart.products.find(
      (p) => p.productId.toString() === productId
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Remove product and recalculate totals
    cart.products = cart.products.filter(
      (p) => p.productId.toString() !== productId
    );

    cart.totalAmount = cart.products.reduce((acc, p) => acc + p.price, 0);
    cart.totalItems = cart.products.length;

    await cart.save();

    return res.status(200).json({ message: "Product removed from cart", cart });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error removing from cart" });
  }
};

export { getCart, addToCart, updateCart, deleteCart };
