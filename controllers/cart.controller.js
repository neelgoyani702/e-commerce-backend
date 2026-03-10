import Cart from "../models/cart.model.js";
import Product from "../models/products.model.js";

// Helper: compute discounted unit price (supports variant priceOverride)
function getEffectivePrice(product, variant) {
  const basePrice = (variant?.priceOverride != null) ? variant.priceOverride : product.price;
  if (product.discount > 0) {
    return Math.round(basePrice - (basePrice * product.discount / 100));
  }
  return basePrice;
}

// Helper: build variant label string for display
function buildVariantLabel(variant) {
  if (!variant) return "";
  const parts = [];
  if (variant.size) parts.push(variant.size);
  if (variant.color) parts.push(variant.color);
  return parts.join(" / ");
}

// Helper: get stock for a specific variant or product-level stock
function getAvailableStock(product, variantId) {
  if (variantId && product.variants?.length > 0) {
    const variant = product.variants.id(variantId);
    return variant ? variant.stock : 0;
  }
  return product.stock;
}

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate({
      path: "products.productId",
      select: "name price image images discount stock variants",
    });

    if (!cart) {
      return res.status(200).json({ message: "Cart is empty", cart: { products: [], totalAmount: 0, totalItems: 0 } });
    }

    // Recalculate prices based on current product data (discounts/variant prices may have changed)
    let changed = false;
    for (const item of cart.products) {
      if (item.productId) {
        const variant = item.variantId ? item.productId.variants?.id(item.variantId) : null;
        const effectivePrice = getEffectivePrice(item.productId, variant);
        const correctLinePrice = effectivePrice * item.quantity;
        if (item.price !== correctLinePrice) {
          item.price = correctLinePrice;
          changed = true;
        }
        // Update variant label if variant still exists
        if (variant) {
          const newLabel = buildVariantLabel(variant);
          if (item.variantLabel !== newLabel) {
            item.variantLabel = newLabel;
            changed = true;
          }
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
    const { productId, quantity = 1, ATC, variantId } = req.body;

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

    // If product has variants, require variantId
    if (productDoc.variants?.length > 0 && !variantId) {
      return res.status(400).json({ message: "Please select a size/color variant" });
    }

    // Get the selected variant (if any)
    let variant = null;
    if (variantId && productDoc.variants?.length > 0) {
      variant = productDoc.variants.id(variantId);
      if (!variant) {
        return res.status(404).json({ message: "Selected variant not found" });
      }
    }

    // Check stock (variant-level or product-level)
    const availableStock = variant ? variant.stock : productDoc.stock;
    if (availableStock === 0) {
      return res.status(400).json({ message: "Product is out of stock" });
    }

    const unitPrice = getEffectivePrice(productDoc, variant);
    const variantLabel = buildVariantLabel(variant);
    const cart = await Cart.findOne({ userId: req.user._id });
    let stockCapped = false;
    let cappedMessage = null;

    if (cart) {
      // Find existing item by productId AND variantId
      const existingItem = cart.products.find(
        (p) => p.productId.toString() === productId &&
          ((!p.variantId && !variantId) || (p.variantId?.toString() === variantId))
      );

      if (existingItem) {
        if (ATC) {
          const newQty = existingItem.quantity + Number(quantity);
          if (availableStock && newQty > availableStock) {
            existingItem.quantity = availableStock;
            stockCapped = true;
            cappedMessage = `Only ${availableStock} "${productDoc.name}${variantLabel ? ` (${variantLabel})` : ''}" available. Quantity set to maximum.`;
          } else {
            existingItem.quantity = newQty;
          }
          existingItem.price = existingItem.quantity * unitPrice;
        } else {
          const newQty = Number(quantity);
          if (availableStock && newQty > availableStock) {
            existingItem.quantity = availableStock;
            stockCapped = true;
            cappedMessage = `Only ${availableStock} "${productDoc.name}${variantLabel ? ` (${variantLabel})` : ''}" available. Quantity set to maximum.`;
          } else {
            existingItem.quantity = newQty;
          }
          existingItem.price = existingItem.quantity * unitPrice;
        }
      } else {
        let cappedQty = Number(quantity);
        if (availableStock && cappedQty > availableStock) {
          cappedQty = availableStock;
          stockCapped = true;
          cappedMessage = `Only ${availableStock} "${productDoc.name}${variantLabel ? ` (${variantLabel})` : ''}" available. Quantity set to maximum.`;
        }
        cart.products.push({
          productId,
          quantity: cappedQty,
          price: unitPrice * cappedQty,
          variantId: variantId || undefined,
          variantLabel: variantLabel || undefined,
        });
      }

      cart.totalAmount = cart.products.reduce((acc, p) => acc + p.price, 0);
      cart.totalItems = cart.products.length;

      await cart.save();
      const message = stockCapped ? cappedMessage : "Product added to cart";
      return res.status(201).json({ message, cart, stockCapped });
    }

    // Cart does not exist — create new one
    let cappedQty = Number(quantity);
    if (availableStock && cappedQty > availableStock) {
      cappedQty = availableStock;
      stockCapped = true;
      cappedMessage = `Only ${availableStock} "${productDoc.name}${variantLabel ? ` (${variantLabel})` : ''}" available. Quantity set to maximum.`;
    }
    const newCart = await Cart.create({
      userId: req.user._id,
      products: [{
        productId,
        quantity: cappedQty,
        price: unitPrice * cappedQty,
        variantId: variantId || undefined,
        variantLabel: variantLabel || undefined,
      }],
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
    const { productId, quantity, variantId } = req.body;

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
      (p) => p.productId.toString() === productId &&
        ((!p.variantId && !variantId) || (p.variantId?.toString() === variantId))
    );

    if (!existingItem) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    const productDoc = await Product.findById(productId);
    if (!productDoc) {
      return res.status(404).json({ message: "Product no longer exists" });
    }

    const variant = variantId ? productDoc.variants?.id(variantId) : null;
    const unitPrice = getEffectivePrice(productDoc, variant);
    const availableStock = variant ? variant.stock : productDoc.stock;
    const cappedQty = availableStock ? Math.min(Number(quantity), availableStock) : Number(quantity);
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
    const { variantId } = req.query;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const product = cart.products.find(
      (p) => p.productId.toString() === productId &&
        ((!p.variantId && !variantId) || (p.variantId?.toString() === variantId))
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    cart.products = cart.products.filter(
      (p) => !(p.productId.toString() === productId &&
        ((!p.variantId && !variantId) || (p.variantId?.toString() === variantId)))
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
