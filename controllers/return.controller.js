import Return from "../models/return.model.js";
import Order from "../models/order.model.js";
import Product from "../models/products.model.js";

const RETURN_WINDOW_DAYS = 7;

// User: Create a return request
const createReturn = async (req, res) => {
  try {
    const { orderId, reason, reasonDetail, items } = req.body;

    if (!orderId || !reason || !items || items.length === 0) {
      return res.status(400).json({ message: "Order ID, reason, and at least one item are required" });
    }

    // Verify order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (order.status !== "delivered") {
      return res.status(400).json({ message: "Only delivered orders can be returned" });
    }

    // Check return window (7 days from delivery)
    const deliveredEntry = order.statusHistory?.find(h => h.status === "delivered");
    const deliveredDate = deliveredEntry ? new Date(deliveredEntry.timestamp) : new Date(order.updatedAt);
    const daysSinceDelivery = Math.floor((Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      return res.status(400).json({
        message: `Return window has expired. Returns must be requested within ${RETURN_WINDOW_DAYS} days of delivery.`,
      });
    }

    // Check if a return already exists for this order (any status)
    const existingReturn = await Return.findOne({ orderId });
    if (existingReturn) {
      return res.status(400).json({
        message: `A return request already exists for this order (status: ${existingReturn.status})`,
      });
    }

    // Validate items against order products
    const validItems = [];
    for (const item of items) {
      const orderProduct = order.products.find(
        (p) => (p.productId._id || p.productId).toString() === item.productId &&
          ((!p.variantId && !item.variantId) || (p.variantId?.toString() === item.variantId))
      );
      if (!orderProduct) {
        return res.status(400).json({ message: `Product ${item.productId} not found in this order` });
      }
      if (item.quantity > orderProduct.quantity) {
        return res.status(400).json({ message: `Cannot return more than ordered quantity` });
      }
      validItems.push({
        productId: item.productId,
        variantId: item.variantId || undefined,
        variantLabel: orderProduct.variantLabel || undefined,
        quantity: item.quantity,
        price: (orderProduct.price / orderProduct.quantity) * item.quantity, // proportional price
      });
    }

    const itemsSubtotal = validItems.reduce((sum, i) => sum + i.price, 0);

    // Deduct proportional coupon discount from refund
    let refundAmount = itemsSubtotal;
    if (order.couponDiscount && order.couponDiscount > 0) {
      const orderSubtotal = order.totalAmount + order.couponDiscount; // original subtotal before coupon
      const proportion = itemsSubtotal / orderSubtotal;
      refundAmount = itemsSubtotal - Math.round(order.couponDiscount * proportion);
    }

    const returnRequest = await Return.create({
      orderId,
      userId: req.user._id,
      reason,
      reasonDetail: reasonDetail || "",
      items: validItems,
      refundAmount: Math.round(Math.max(refundAmount, 0)),
    });

    return res.status(201).json({
      message: "Return request submitted successfully",
      returnRequest,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error creating return request" });
  }
};

// User: Get my return requests
const getUserReturns = async (req, res) => {
  try {
    const returns = await Return.find({ userId: req.user._id })
      .populate("orderId", "status totalAmount createdAt")
      .populate("items.productId", "name image price")
      .sort({ createdAt: -1 });

    return res.status(200).json({ message: "Returns fetched", returns });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error fetching returns" });
  }
};

// Admin: Get all return requests
const getAllReturns = async (req, res) => {
  try {
    const returns = await Return.find()
      .populate("userId", "firstName lastName email image")
      .populate("orderId", "status totalAmount createdAt")
      .populate("items.productId", "name image price")
      .sort({ createdAt: -1 });

    return res.status(200).json({ message: "All returns fetched", returns });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error fetching returns" });
  }
};

// Admin: Update return status (approve/reject/refund)
const updateReturnStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!status || !["approved", "rejected", "refunded"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved', 'rejected', or 'refunded'" });
    }

    const returnRequest = await Return.findById(req.params.id);
    if (!returnRequest) {
      return res.status(404).json({ message: "Return request not found" });
    }

    // Validate transition
    if (returnRequest.status === "refunded") {
      return res.status(400).json({ message: "Already refunded, cannot change" });
    }
    if (returnRequest.status === "rejected" && status !== "approved") {
      return res.status(400).json({ message: "Rejected returns can only be re-approved" });
    }

    // On approve: restore stock for returned items
    if (status === "approved" && returnRequest.status !== "approved") {
      for (const item of returnRequest.items) {
        const productId = item.productId._id || item.productId;
        if (item.variantId) {
          await Product.findOneAndUpdate(
            { _id: productId, "variants._id": item.variantId },
            { $inc: { "variants.$.stock": item.quantity, stock: item.quantity } }
          );
        } else {
          await Product.findByIdAndUpdate(productId, {
            $inc: { stock: item.quantity },
          });
        }
      }
    }

    returnRequest.status = status;
    if (adminNote) returnRequest.adminNote = adminNote;
    const updated = await returnRequest.save();

    // Populate for response
    await updated.populate("userId", "firstName lastName email image");
    await updated.populate("orderId", "status totalAmount createdAt");
    await updated.populate("items.productId", "name image price");

    return res.status(200).json({
      message: `Return ${status}`,
      returnRequest: updated,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error updating return" });
  }
};

// User: Cancel a pending return request
const cancelReturn = async (req, res) => {
  try {
    const returnRequest = await Return.findById(req.params.id);
    if (!returnRequest) {
      return res.status(404).json({ message: "Return request not found" });
    }
    if (returnRequest.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (returnRequest.status !== "pending") {
      return res.status(400).json({ message: "Only pending returns can be cancelled" });
    }

    await Return.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: "Return request cancelled" });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error cancelling return" });
  }
};

export { createReturn, getUserReturns, getAllReturns, updateReturnStatus, cancelReturn };
