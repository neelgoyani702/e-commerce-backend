import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/products.model.js";
import Coupon from "../models/coupon.model.js";

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user._id,
      status: "order placed",
    }).populate("products.productId", "name price image discount stock");

    return res
      .status(200)
      .json({ message: "Orders fetched successfully", orders: orders || [] });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error fetching orders" });
  }
};

const placeOrder = async (req, res) => {
  try {
    const { couponCode } = req.body;

    const cart = await Cart.findOne({ userId: req.user._id }).populate({
      path: "products.productId",
      select: "name price image discount stock variants",
    });

    if (!cart || !cart.products || cart.products.length === 0) {
      return res.status(400).json({ message: "Your cart is empty" });
    }

    // Validate stock for all products before placing order
    const stockErrors = [];
    for (const item of cart.products) {
      const product = await Product.findById(item.productId._id || item.productId);
      if (!product) {
        stockErrors.push(`Product "${item.productId.name || 'Unknown'}" is no longer available`);
        continue;
      }

      // Check variant-level or product-level stock
      if (item.variantId && product.variants?.length > 0) {
        const variant = product.variants.id(item.variantId);
        if (!variant) {
          stockErrors.push(`Selected variant for "${product.name}" is no longer available`);
        } else if (variant.stock < item.quantity) {
          if (variant.stock === 0) {
            stockErrors.push(`"${product.name} (${item.variantLabel || ''})" is out of stock`);
          } else {
            stockErrors.push(`Only ${variant.stock} "${product.name} (${item.variantLabel || ''})" available (you have ${item.quantity} in cart)`);
          }
        }
      } else {
        if (product.stock < item.quantity) {
          if (product.stock === 0) {
            stockErrors.push(`"${product.name}" is out of stock`);
          } else {
            stockErrors.push(`Only ${product.stock} "${product.name}" available (you have ${item.quantity} in cart)`);
          }
        }
      }
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({
        message: "Some items have stock issues",
        errors: stockErrors,
      });
    }

    // Handle coupon validation and discount
    let couponDiscount = 0;
    let appliedCouponCode = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });

      if (coupon && coupon.isActive) {
        const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) >= new Date();
        const withinLimit = coupon.maxUses === 0 || coupon.usedCount < coupon.maxUses;
        const meetsMinimum = cart.totalAmount >= coupon.minOrderAmount;

        if (notExpired && withinLimit && meetsMinimum) {
          if (coupon.discountType === "percentage") {
            couponDiscount = Math.round((cart.totalAmount * coupon.discountValue) / 100);
          } else {
            couponDiscount = coupon.discountValue;
          }
          couponDiscount = Math.min(couponDiscount, cart.totalAmount);
          appliedCouponCode = coupon.code;

          // Increment usage count
          await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
        }
      }
    }

    const finalAmount = cart.totalAmount - couponDiscount;

    // Create the order
    const order = new Order({
      userId: req.user._id,
      totalItems: cart.totalItems,
      totalAmount: finalAmount,
      couponCode: appliedCouponCode,
      couponDiscount,
      products: cart.products,
    });

    const savedOrder = await order.save();

    if (!savedOrder) {
      return res.status(500).json({ message: "Failed to place order" });
    }

    // Decrement stock for each product (variant-level and product-level)
    for (const item of cart.products) {
      const productId = item.productId._id || item.productId;
      if (item.variantId) {
        // Decrement variant stock and product total stock
        await Product.findOneAndUpdate(
          { _id: productId, "variants._id": item.variantId },
          {
            $inc: {
              "variants.$.stock": -item.quantity,
              stock: -item.quantity,
            },
          }
        );
      } else {
        await Product.findByIdAndUpdate(productId, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    // Clear the cart after successful order placement
    await Cart.findOneAndDelete({ userId: req.user._id });

    // Populate product details for the response
    const populatedOrder = await Order.findById(savedOrder._id).populate(
      "products.productId",
      "name price image discount stock variants"
    );

    return res
      .status(201)
      .json({ message: "Order placed successfully", savedOrder: populatedOrder });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error placing order" });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Ownership check — only the user who placed the order can cancel it
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to cancel this order" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    if (order.status === "delivered") {
      return res.status(400).json({ message: "Delivered orders cannot be cancelled" });
    }

    // Restore stock for each product
    for (const item of order.products) {
      const productId = item.productId._id || item.productId;
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: item.quantity },
      });
    }

    order.status = "cancelled";
    const updatedOrder = await order.save();

    return res
      .status(200)
      .json({ message: "Order cancelled successfully", updatedOrder });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error cancelling order" });
  }
};

const deliveredOrder = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "delivered") {
      return res.status(400).json({ message: "Order is already delivered" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Cancelled orders cannot be delivered" });
    }

    order.status = "delivered";
    const updatedOrder = await order.save();

    return res
      .status(200)
      .json({ message: "Order delivered successfully", updatedOrder });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error delivering order" });
  }
};

const orderHistory = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate("products.productId", "name price image discount stock")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ message: "Order history fetched successfully", orders: orders || [] });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error fetching order history" });
  }
};

const getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const orders = await Order.find()
      .populate("userId", "firstName lastName email image")
      .populate("products.productId", "name price image discount stock")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ message: "All orders fetched successfully", orders: orders || [] });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error fetching all orders" });
  }
};

export {
  getOrders,
  placeOrder,
  cancelOrder,
  deliveredOrder,
  orderHistory,
  getAllOrders,
};
