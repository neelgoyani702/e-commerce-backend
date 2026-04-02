import Cart from "../models/cart.model.js";
import Product from "../models/products.model.js";
import FlashSale from "../models/flashSale.model.js";
import Bundle from "../models/bundle.model.js";

async function getActiveFlashSales() {
  const now = new Date();
  return await FlashSale.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gt: now },
  });
}

async function getActiveBundles() {
  return await Bundle.find({ isActive: true });
}

function getBundleDiscount(productId, cartProducts, activeBundles) {
  let maxDiscount = 0;
  for (const bundle of activeBundles) {
    const bundleProductIds = [
      bundle.mainProduct.toString(),
      ...bundle.additionalProducts.map((id) => id.toString()),
    ];

    if (bundleProductIds.includes(productId.toString())) {
      const cartProductIds = cartProducts.map((p) =>
        (p.productId?._id || p.productId).toString()
      );

      const isBundleComplete = bundleProductIds.every((id) =>
        cartProductIds.includes(id)
      );

      if (isBundleComplete && bundle.discountPercentage > maxDiscount) {
        maxDiscount = bundle.discountPercentage;
      }
    }
  }
  return maxDiscount;
}

function getEffectivePrice(product, variant, activeFlashSales = [], bundleDiscountPct = 0) {
  let basePrice = (variant?.priceOverride != null) ? variant.priceOverride : product.price;
  let currentBestPrice = basePrice;
  let inFlashSale = false;

  for (const sale of activeFlashSales) {
    const productInSale = sale.products.find(
      (p) => p.product.toString() === product._id.toString()
    );
    if (productInSale) {
      currentBestPrice = productInSale.salePrice;
      inFlashSale = true;
      break;
    }
  }

  if (!inFlashSale && product.discount && product.discount > 0) {
    currentBestPrice = Math.round(basePrice - (basePrice * product.discount / 100));
  }

  if (bundleDiscountPct > 0) {
    currentBestPrice = Math.round(currentBestPrice - (currentBestPrice * bundleDiscountPct / 100));
  }

  return currentBestPrice;
}

async function recalculateCartPrices(cart) {
  const activeFlashSales = await getActiveFlashSales();
  const activeBundles = await getActiveBundles();

  let changed = false;
  for (const item of cart.products) {
    if (!item.productId) continue;

    let productDoc = item.productId;
    if (!productDoc.price) {
      productDoc = await Product.findById(item.productId);
      if (!productDoc) continue;
    }

    const variant = item.variantId && productDoc.variants ? productDoc.variants.id(item.variantId) : null;
    const bundleDiscount = getBundleDiscount(productDoc._id, cart.products, activeBundles);
    const effectivePrice = getEffectivePrice(productDoc, variant, activeFlashSales, bundleDiscount);

    const correctLinePrice = effectivePrice * item.quantity;
    if (item.price !== correctLinePrice) {
      item.price = correctLinePrice;
      changed = true;
    }

    if (variant) {
      const newLabel = buildVariantLabel(variant);
      if (item.variantLabel !== newLabel) {
        item.variantLabel = newLabel;
        changed = true;
      }
    }
  }

  const computedTotal = cart.products.reduce((acc, p) => acc + p.price, 0);
  if (cart.totalAmount !== computedTotal) {
    cart.totalAmount = computedTotal;
    changed = true;
  }

  return changed;
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

    const priceChanged = await recalculateCartPrices(cart);
    if (priceChanged) {
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

    const availableStock = variant ? variant.stock : productDoc.stock;
    if (availableStock === 0) {
      return res.status(400).json({ message: "Product is out of stock" });
    }

    const activeFlashSales = await getActiveFlashSales();
    const unitPrice = getEffectivePrice(productDoc, variant, activeFlashSales);
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

      await recalculateCartPrices(cart);
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
    
    await recalculateCartPrices(newCart);
    await newCart.save();

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
    const activeFlashSales = await getActiveFlashSales();
    const unitPrice = getEffectivePrice(productDoc, variant, activeFlashSales);
    const availableStock = variant ? variant.stock : productDoc.stock;
    const cappedQty = availableStock ? Math.min(Number(quantity), availableStock) : Number(quantity);
    existingItem.quantity = cappedQty;
    existingItem.price = cappedQty * unitPrice;

    cart.totalAmount = cart.products.reduce((acc, p) => acc + p.price, 0);
    cart.totalItems = cart.products.length;

    await recalculateCartPrices(cart);
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

    await recalculateCartPrices(cart);
    await cart.save();

    return res.status(200).json({ message: "Product removed from cart", cart });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error removing from cart" });
  }
};

const reorderFromOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Import Order model inline to avoid circular dependency issues
    const { default: Order } = await import("../models/order.model.js");

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (order.status !== "delivered") {
      return res.status(400).json({ message: "Only delivered orders can be reordered" });
    }

    let cart = await Cart.findOne({ userId: req.user._id });
    const results = [];
    let addedCount = 0;

    for (const item of order.products) {
      const productId = item.productId._id || item.productId;
      const product = await Product.findById(productId);

      if (!product) {
        results.push({ name: "Unknown product", status: "unavailable" });
        continue;
      }

      // Get variant and stock
      let variant = null;
      let availableStock = product.stock;
      if (item.variantId && product.variants?.length > 0) {
        variant = product.variants.id(item.variantId);
        if (!variant) {
          results.push({ name: product.name, status: "variant unavailable" });
          continue;
        }
        availableStock = variant.stock;
      }

      if (availableStock === 0) {
        results.push({ name: product.name, status: "out of stock" });
        continue;
      }

      const activeFlashSales = await getActiveFlashSales();
      const unitPrice = getEffectivePrice(product, variant, activeFlashSales);
      const variantLabel = buildVariantLabel(variant);
      const qty = Math.min(item.quantity, availableStock);

      if (!cart) {
        cart = await Cart.create({
          userId: req.user._id,
          products: [{
            productId,
            quantity: qty,
            price: unitPrice * qty,
            variantId: item.variantId || undefined,
            variantLabel: variantLabel || undefined,
          }],
          totalAmount: unitPrice * qty,
          totalItems: 1,
        });
      } else {
        // Check if item already exists in cart
        const existingItem = cart.products.find(
          (p) => p.productId.toString() === productId.toString() &&
            ((!p.variantId && !item.variantId) || (p.variantId?.toString() === item.variantId?.toString()))
        );

        if (existingItem) {
          const newQty = Math.min(existingItem.quantity + qty, availableStock);
          existingItem.quantity = newQty;
          existingItem.price = newQty * unitPrice;
        } else {
          cart.products.push({
            productId,
            quantity: qty,
            price: unitPrice * qty,
            variantId: item.variantId || undefined,
            variantLabel: variantLabel || undefined,
          });
        }

        cart.totalAmount = cart.products.reduce((acc, p) => acc + p.price, 0);
        cart.totalItems = cart.products.length;
        await cart.save();
      }

      addedCount++;
      results.push({
        name: product.name,
        status: qty < item.quantity ? "partial" : "added",
        qty,
      });
    }

    if (cart) {
      await recalculateCartPrices(cart);
      await cart.save();
    }

    return res.status(200).json({
      message: addedCount > 0
        ? `${addedCount} item${addedCount > 1 ? "s" : ""} added to cart`
        : "No items could be added to cart",
      results,
      addedCount,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error reordering" });
  }
};

export { getCart, addToCart, updateCart, deleteCart, reorderFromOrder };
