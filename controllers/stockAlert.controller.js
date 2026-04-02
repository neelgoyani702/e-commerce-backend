import StockAlert from "../models/stockAlert.model.js";

// Create or subscribe to an alert
const createAlert = async (req, res) => {
  try {
    const { productId, variantId } = req.body;
    const userId = req.user._id;
    const email = req.user.email;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Check existing
    const existing = await StockAlert.findOne({
      userId,
      productId,
      variantId: variantId || null,
    });

    if (existing) {
      return res.status(400).json({ message: "Already subscribed to this alert" });
    }

    const alert = await StockAlert.create({
      userId,
      productId,
      variantId: variantId || null,
      email,
    });

    return res.status(201).json({ message: "You'll be notified when back in stock", alert });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error creating alert" });
  }
};

// Get user's active alerts
const getUserAlerts = async (req, res) => {
  try {
    const alerts = await StockAlert.find({
      userId: req.user._id,
      notified: false,
    }).populate("productId", "name image images price");

    return res.status(200).json({ alerts });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error fetching alerts" });
  }
};

// Delete/unsubscribe from alert
const deleteAlert = async (req, res) => {
  try {
    const alert = await StockAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }
    if (alert.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await StockAlert.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Alert removed" });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error removing alert" });
  }
};

// Check if user has alert for a product (used by frontend)
const checkAlert = async (req, res) => {
  try {
    const { productId, variantId } = req.query;
    const alert = await StockAlert.findOne({
      userId: req.user._id,
      productId,
      variantId: variantId || null,
      notified: false,
    });
    return res.status(200).json({ subscribed: !!alert, alertId: alert?._id || null });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error checking alert" });
  }
};

// Admin: get alert count per product
const getAlertCount = async (req, res) => {
  try {
    const count = await StockAlert.countDocuments({
      productId: req.params.productId,
      notified: false,
    });
    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Error fetching alert count" });
  }
};

export { createAlert, getUserAlerts, deleteAlert, checkAlert, getAlertCount };
