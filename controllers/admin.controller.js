import Order from "../models/order.model.js";
import Product from "../models/products.model.js";
import Category from "../models/category.model.js";
import User from "../models/user.model.js";
import ActivityLog from "../models/activityLog.model.js";

// Helper to log admin activity
const logActivity = async (userId, action, targetType, targetId, targetName, details) => {
  try {
    await ActivityLog.create({ userId, action, targetType, targetId, targetName, details });
  } catch (err) {
    console.error("Activity log error:", err.message);
  }
};

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

    // Top selling products (by times ordered)
    const topProducts = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: "$products.price" },
        },
      },
      { $sort: { totalOrders: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: "$product.name",
          image: "$product.image",
          totalOrders: 1,
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ]);

    // Top customers (by total spend)
    const topCustomers = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$userId",
          totalSpent: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          email: "$user.email",
          image: "$user.image",
          totalSpent: 1,
          orderCount: 1,
        },
      },
    ]);

    // Today's orders
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfDay } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);
    const today = todayAgg[0] || { count: 0, revenue: 0 };

    // Last month totals for comparison
    const startOfThisMonth = new Date();
    startOfThisMonth.setDate(1);
    startOfThisMonth.setHours(0, 0, 0, 0);
    const startOfLastMonth = new Date(startOfThisMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

    const [thisMonthAgg, lastMonthAgg] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfThisMonth },
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth },
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);
    const thisMonth = thisMonthAgg[0] || { orders: 0, revenue: 0 };
    const lastMonth = lastMonthAgg[0] || { orders: 0, revenue: 0 };

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
        topProducts,
        topCustomers,
        today,
        comparison: {
          thisMonth,
          lastMonth,
        },
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

    await logActivity(
      req.user._id,
      "user_role_updated",
      "user",
      user._id,
      `${user.firstName} ${user.lastName}`,
      `Role changed to ${role}`
    );

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

    await logActivity(
      req.user._id,
      "order_status_updated",
      "order",
      order._id,
      `#${order._id.toString().slice(-8).toUpperCase()}`,
      `Status changed to ${status}`
    );

    return res
      .status(200)
      .json({ message: `Order status updated to ${status}`, order: updatedOrder });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error updating order status" });
  }
};

const getActivityLog = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const filter = {};
    if (type && type !== "all") {
      filter.targetType = type;
    }
    const total = await ActivityLog.countDocuments(filter);
    const logs = await ActivityLog.find(filter)
      .populate("userId", "firstName lastName email image")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.status(200).json({
      message: "Activity log fetched",
      logs,
      total,
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error fetching activity log" });
  }
};

// #12 — Low Stock / Inventory Alerts
const getLowStockProducts = async (req, res) => {
  try {
    const threshold = Number(req.query.threshold) || 5;
    const products = await Product.find({ stock: { $lte: threshold } })
      .populate("category", "name")
      .sort({ stock: 1 })
      .select("name image price stock category");

    return res.status(200).json({
      message: "Low stock products fetched",
      products,
      threshold,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error fetching low stock products" });
  }
};

// #13 — Customer Insights
const getCustomerInsights = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await User.findById(id).select("-password");
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get all orders for this customer
    const orders = await Order.find({ userId: id })
      .populate("products.productId", "name price image")
      .sort({ createdAt: -1 });

    // Compute stats
    const totalOrders = orders.length;
    const totalSpent = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
    const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;

    // Average order value
    const validOrders = orders.filter((o) => o.status !== "cancelled");
    const avgOrderValue = validOrders.length > 0
      ? Math.round(totalSpent / validOrders.length)
      : 0;

    // Most ordered products
    const productCounts = {};
    orders.forEach((o) => {
      if (o.status !== "cancelled") {
        o.products?.forEach((p) => {
          const pid = p.productId?._id?.toString();
          if (pid) {
            if (!productCounts[pid]) {
              productCounts[pid] = {
                name: p.productId.name,
                image: p.productId.image,
                count: 0,
                totalSpent: 0,
              };
            }
            productCounts[pid].count += p.quantity || 1;
            productCounts[pid].totalSpent += p.price || 0;
          }
        });
      }
    });
    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.status(200).json({
      message: "Customer insights fetched",
      customer,
      stats: {
        totalOrders,
        totalSpent,
        deliveredOrders,
        cancelledOrders,
        avgOrderValue,
      },
      topProducts,
      recentOrders: orders.slice(0, 10),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error fetching customer insights" });
  }
};

// #14 — Coupon CRUD
import Coupon from "../models/coupon.model.js";

const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return res.status(200).json({ message: "Coupons fetched", coupons });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error fetching coupons" });
  }
};

const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;
    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ message: "Code, discount type and value are required" });
    }
    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxUses: Number(maxUses) || 0,
      expiresAt: expiresAt || null,
    });

    await logActivity(req.user._id, "coupon_created", "coupon", coupon._id, coupon.code, `Coupon created: ${discountType} ${discountValue}`);

    return res.status(201).json({ message: "Coupon created", coupon });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error creating coupon" });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const { isActive, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    if (isActive !== undefined) coupon.isActive = isActive === true || isActive === "true";
    if (discountValue !== undefined) coupon.discountValue = Number(discountValue);
    if (minOrderAmount !== undefined) coupon.minOrderAmount = Number(minOrderAmount);
    if (maxUses !== undefined) coupon.maxUses = Number(maxUses);
    if (expiresAt !== undefined) coupon.expiresAt = expiresAt || null;

    const updated = await coupon.save();

    await logActivity(req.user._id, "coupon_updated", "coupon", updated._id, updated.code, "Coupon updated");

    return res.status(200).json({ message: "Coupon updated", coupon: updated });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error updating coupon" });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    await logActivity(req.user._id, "coupon_deleted", "coupon", coupon._id, coupon.code, "Coupon deleted");

    return res.status(200).json({ message: "Coupon deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message, message: "Error deleting coupon" });
  }
};

export {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  updateOrderStatus,
  getActivityLog,
  logActivity,
  getLowStockProducts,
  getCustomerInsights,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
