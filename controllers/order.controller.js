import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";

const getOrders = async (req, res) => {
  try {
    // order with populate all products with status is order placed

    // const orders = await Order.find({ userId: req.user._id }).populate(
    //   "products.productId"
    // );

    // show only order placed status orders

    const orders = await Order.find({
      userId: req.user._id,
      status: "order placed",
    }).populate("products.productId");

    console.log("orders", orders);

    if (!orders) {
      return res.status(400).json({ message: "No orders found" });
    }

    return res
      .status(200)
      .json({ message: "order fetched successfully", orders });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "error in getting orders" });
  }
};

const placeOrder = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    console.log("cart", cart);

    if (!cart) {
      return res.status(400).json({ message: "No items in cart" });
    }

    const order = new Order({
      userId: req.user._id,
      totalItems: cart.totalItems,
      totalAmount: cart.totalAmount,
      products: cart.products,
    });

    const savedOrder = await order.save();

    if (!savedOrder) {
      return res.status(400).json({ message: "order not placed" });
    }

    // await Cart.findOneAndDelete({ userId: req.user._id });
    console.log("savedOrder", savedOrder);

    return res
      .status(200)
      .json({ message: "order placed successfully", savedOrder });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "error in placing order" });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(400).json({ message: "No order found" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Order already cancelled" });
    }

    order.status = "cancelled";
    const updatedOrder = await order.save();

    if (!updatedOrder) {
      return res.status(400).json({ message: "order not cancelled" });
    }

    return res
      .status(200)
      .json({ message: "order cancelled successfully", updatedOrder });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "error in cancelling order" });
  }
};

const deliveredOrder = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(400).json({ message: "Only admin can access" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(400).json({ message: "No order found" });
    }

    if (order.status === "delivered") {
      return res.status(400).json({ message: "Order already delivered" });
    }

    order.status = "delivered";
    const updatedOrder = await order.save();

    if (!updatedOrder) {
      return res.status(400).json({ message: "order not delivered" });
    }

    return res
      .status(200)
      .json({ message: "order delivered successfully", updatedOrder });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "error in delivering order" });
  }
};

const orderHistory = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id });

    if (!orders) {
      return res.status(400).json({ message: "No orders found" });
    }

    return res
      .status(200)
      .json({ message: "orders fetched successfully", orders });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "error in getting orders" });
  }
};

const getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(400).json({ message: "Only admin can access" });
    }

    const orders = await Order.find().populate("products.productId");

    if (!orders) {
      return res.status(400).json({ message: "No orders found" });
    }

    return res
      .status(200)
      .json({ message: "orders fetched successfully", orders });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "error in getting orders" });
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
