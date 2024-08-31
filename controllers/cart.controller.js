import Cart from "../models/cart.model.js";
import Product from "../models/products.model.js";

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate({
      path: "products.productId",
      select: "name price image",
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    return res.status(200).json({ message: "cart fetched successfully", cart });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "error in get cart" });
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, ATC } = req.body;

    if (!productId || !quantity) {
      return res
        .status(400)
        .json({ message: "productId, quantity and price are required" });
    }

    const product = await Product.findById(productId);
    const price = product.price * quantity;
    const cart = await Cart.findOne({ userId: req.user._id });

    if (cart) {
      // if cart already exists for the user

      const product = cart.products.find(
        (p) => p.productId.toString() === productId
      );

      if (product) {
        // if product already exists in the cart

        if (Number(quantity) <= 0) {
          cart.products = cart.products.filter(
            (p) => p.productId.toString() !== productId
          );
        }
        cart.products = cart.products.map((p) =>
          p.productId.toString() === productId ? product : p
        );

        if (ATC) {
          product.quantity = product.quantity + Number(quantity);
          product.price = product.price + Number(price);

          cart.totalAmount = cart.totalAmount + price;
          cart.totalItems = cart.products.length;
        } else {
          cart.totalAmount = cart.totalAmount - product.price + price;
          cart.totalItems = cart.products.length;

          product.quantity = Number(quantity);
          product.price = Number(price);
        }
      } else {
        // if product does not exist in the cart
        cart.products.push({ productId, quantity, price });
        cart.totalAmount = cart.totalAmount + price;
        cart.totalItems = cart.products.length;
      }

      await cart.save();
      console.log("cart", cart);
      return res.status(201).json({ message: "Product added to cart", cart });
    }

    // if cart does not exist for the user
    const newCart = await Cart.create({
      userId: req.user._id,
      products: [{ productId, quantity, price }],
      totalAmount: price,
      totalItems: quantity,
    });

    console.log("cart", newCart);
    return res
      .status(201)
      .json({ message: "Product added to cart", cart: newCart });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "error in add to cart" });
  }
};

const updateCart = async (req, res) => { };

const deleteCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId: req.user._id });
    console.log("cart", cart);

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const product = cart.products.find(
      (p) => p.productId.toString() === productId
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    cart.totalAmount = cart.totalAmount - product.price;
    cart.totalItems = cart.totalItems - product.quantity;

    cart.products = cart.products.filter(
      (p) => p.productId.toString() !== productId
    );

    await cart.save();

    return res.status(200).json({ message: "Product deleted from cart", cart });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "error in delete cart " });
  }
};

export { getCart, addToCart, updateCart, deleteCart };
