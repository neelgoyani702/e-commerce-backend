import Order from "../models/order.model.js";
import Product from "../models/products.model.js";
import Category from "../models/category.model.js";
import User from "../models/user.model.js";

const getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const [totalOrders, totalProducts, totalCategories, totalUsers] =
      await Promise.all([
        Order.countDocuments(),
        Product.countDocuments(),
        Category.countDocuments(),
        User.countDocuments(),
      ]);

    // Revenue & status distribution
    const revenueAgg = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          orderPlaced: {
            $sum: { $cond: [{ $eq: ["$status", "order placed"] }, 1, 0] },
          },
          delivered: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
    ]);

    const stats = revenueAgg[0] || {
      totalRevenue: 0,
      orderPlaced: 0,
      delivered: 0,
      cancelled: 0,
    };

    // Monthly revenue (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Format monthly data with month names
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const monthlyData = monthlyRevenue.map((m) => ({
      month: monthNames[m._id.month - 1],
      year: m._id.year,
      revenue: m.revenue,
      orders: m.orders,
    }));

    // Recent orders (last 5)
    const recentOrders = await Order.find()
      .populate("userId", "firstName lastName email image")
      .populate("products.productId", "name price image")
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      message: "Dashboard stats fetched successfully",
      stats: {
        totalOrders,
        totalProducts,
        totalCategories,
        totalUsers,
        totalRevenue: stats.totalRevenue,
        orderDistribution: {
          orderPlaced: stats.orderPlaced,
          delivered: stats.delivered,
          cancelled: stats.cancelled,
        },
        monthlyRevenue: monthlyData,
        recentOrders,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error fetching dashboard stats" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Users fetched successfully",
      users: users || [],
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error fetching users" });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !["admin", "user"].includes(role)) {
      return res
        .status(400)
        .json({ message: "Role must be 'admin' or 'user'" });
    }

    // Prevent admin from changing their own role
    if (req.params.id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot change your own role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res
      .status(200)
      .json({ message: `User role updated to ${role}`, user });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error updating user role" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["order placed", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({
        message: "Status must be 'order placed', 'delivered', or 'cancelled'",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "delivered" && status !== "delivered") {
      return res
        .status(400)
        .json({ message: "Delivered orders cannot be changed" });
    }

    if (order.status === "cancelled" && status !== "cancelled") {
      return res
        .status(400)
        .json({ message: "Cancelled orders cannot be changed" });
    }

    order.status = status;
    const updatedOrder = await order.save();

    return res
      .status(200)
      .json({ message: `Order status updated to ${status}`, order: updatedOrder });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error updating order status" });
  }
};

export { getDashboardStats, getAllUsers, updateUserRole, updateOrderStatus };
