import Cart from "../models/cart.model.js";
import Product from "../models/products.model.js";

// Helper: compute discounted unit price
function getEffectivePrice(product) {
  if (product.discount > 0) {
    return Math.round(product.price - (product.price * product.discount / 100));
  }
  return product.price;
}

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate({
      path: "products.productId",
      select: "name price image discount stock",
    });

    if (!cart) {
      return res.status(200).json({ message: "Cart is empty", cart: { products: [], totalAmount: 0, totalItems: 0 } });
    }

    // Recalculate prices based on current product data (discounts may have changed)
    let changed = false;
    for (const item of cart.products) {
      if (item.productId) {
        const effectivePrice = getEffectivePrice(item.productId);
        const correctLinePrice = effectivePrice * item.quantity;
        if (item.price !== correctLinePrice) {
          item.price = correctLinePrice;
          changed = true;
        }
      }
    }

    if (changed) {
      cart.totalAmount = cart.products.reduce((acc, p) => acc + p.price, 0);
      await cart.save();
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

    // Check stock
    if (productDoc.stock === 0) {
      return res.status(400).json({ message: "Product is out of stock" });
    }

    const unitPrice = getEffectivePrice(productDoc);
    const cart = await Cart.findOne({ userId: req.user._id });
    let stockCapped = false;
    let cappedMessage = null;

    if (cart) {
      const existingItem = cart.products.find(
        (p) => p.productId.toString() === productId
      );

      if (existingItem) {
        if (ATC) {
          const newQty = existingItem.quantity + Number(quantity);
          if (productDoc.stock && newQty > productDoc.stock) {
            existingItem.quantity = productDoc.stock;
            stockCapped = true;
            cappedMessage = `Only ${productDoc.stock} "${productDoc.name}" available. Quantity set to maximum.`;
          } else {
            existingItem.quantity = newQty;
          }
          existingItem.price = existingItem.quantity * unitPrice;
        } else {
          const newQty = Number(quantity);
          if (productDoc.stock && newQty > productDoc.stock) {
            existingItem.quantity = productDoc.stock;
            stockCapped = true;
            cappedMessage = `Only ${productDoc.stock} "${productDoc.name}" available. Quantity set to maximum.`;
          } else {
            existingItem.quantity = newQty;
          }
          existingItem.price = existingItem.quantity * unitPrice;
        }
      } else {
        let cappedQty = Number(quantity);
        if (productDoc.stock && cappedQty > productDoc.stock) {
          cappedQty = productDoc.stock;
          stockCapped = true;
          cappedMessage = `Only ${productDoc.stock} "${productDoc.name}" available. Quantity set to maximum.`;
        }
        cart.products.push({ productId, quantity: cappedQty, price: unitPrice * cappedQty });
      }

      cart.totalAmount = cart.products.reduce((acc, p) => acc + p.price, 0);
      cart.totalItems = cart.products.length;

      await cart.save();
      const message = stockCapped ? cappedMessage : "Product added to cart";
      return res.status(201).json({ message, cart, stockCapped });
    }

    // Cart does not exist — create new one
    let cappedQty = Number(quantity);
    if (productDoc.stock && cappedQty > productDoc.stock) {
      cappedQty = productDoc.stock;
      stockCapped = true;
      cappedMessage = `Only ${productDoc.stock} "${productDoc.name}" available. Quantity set to maximum.`;
    }
    const newCart = await Cart.create({
      userId: req.user._id,
      products: [{ productId, quantity: cappedQty, price: unitPrice * cappedQty }],
      totalAmount: unitPrice * cappedQty,
      totalItems: 1,
    });

    const message = stockCapped ? cappedMessage : "Product added to cart";
    return res
      .status(201)
      .json({ message, cart: newCart, stockCapped });
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

    const unitPrice = getEffectivePrice(productDoc);
    const cappedQty = productDoc.stock ? Math.min(Number(quantity), productDoc.stock) : Number(quantity);
    existingItem.quantity = cappedQty;
    existingItem.price = cappedQty * unitPrice;

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
