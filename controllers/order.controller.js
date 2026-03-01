import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user._id,
      status: "order placed",
    }).populate("products.productId", "name price image");

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
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart || !cart.products || cart.products.length === 0) {
      return res.status(400).json({ message: "Your cart is empty" });
    }

    const order = new Order({
      userId: req.user._id,
      totalItems: cart.totalItems,
      totalAmount: cart.totalAmount,
      products: cart.products,
    });

    const savedOrder = await order.save();

    if (!savedOrder) {
      return res.status(500).json({ message: "Failed to place order" });
    }

    // Clear the cart after successful order placement
    await Cart.findOneAndDelete({ userId: req.user._id });

    // Populate product details for the response
    const populatedOrder = await Order.findById(savedOrder._id).populate(
      "products.productId",
      "name price image"
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
      .populate("products.productId", "name price image")
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
      .populate("products.productId", "name price image")
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
