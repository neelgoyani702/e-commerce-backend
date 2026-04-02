import FlashSale from "../models/flashSale.model.js";
import Product from "../models/products.model.js";

// --- Admin Controls ---

// Create a new Flash Sale
export const createFlashSale = async (req, res) => {
  try {
    const { name, startDate, endDate, isActive, products } = req.body;

    if (!name || !startDate || !endDate || !products || products.length === 0) {
      return res.status(400).json({ message: "All fields are required and there must be at least one product" });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    const flashSale = await FlashSale.create({
      name,
      startDate,
      endDate,
      isActive: isActive !== undefined ? isActive : true,
      products,
    });

    res.status(201).json({ message: "Flash Sale created successfully", flashSale });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error creating flash sale" });
  }
};

// Get all Flash Sales
export const getAdminFlashSales = async (req, res) => {
  try {
    const flashSales = await FlashSale.find().sort({ createdAt: -1 }).populate("products.product", "name images price");
    res.status(200).json({ flashSales });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error fetching flash sales" });
  }
};

// Update a Flash Sale
export const updateFlashSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, isActive, products } = req.body;

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    const flashSale = await FlashSale.findByIdAndUpdate(
      id,
      { name, startDate, endDate, isActive, products },
      { new: true, runValidators: true }
    ).populate("products.product", "name images price");

    if (!flashSale) {
      return res.status(404).json({ message: "Flash Sale not found" });
    }

    res.status(200).json({ message: "Flash Sale updated successfully", flashSale });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error updating flash sale" });
  }
};

// Delete a Flash Sale
export const deleteFlashSale = async (req, res) => {
  try {
    const { id } = req.params;
    const flashSale = await FlashSale.findByIdAndDelete(id);

    if (!flashSale) {
      return res.status(404).json({ message: "Flash Sale not found" });
    }

    res.status(200).json({ message: "Flash Sale deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error deleting flash sale" });
  }
};

// --- Public Endpoints ---

// Get the Currently Active Flash Sale(s)
export const getActiveFlashSales = async (req, res) => {
  try {
    const now = new Date();
    // Find flash sales that are active and currently within the timeframe.
    // We can fetch only one global active sale, or multiple. Here we'll return all active ones.
    const flashSales = await FlashSale.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gt: now },
    }).populate("products.product", "name images price slug stock rating numOfReviews category");

    // Returning only the first active flash sale for the home banner is often a good UX practice.
    // However, we'll send an array and let the frontend decide.
    res.status(200).json({ flashSales });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error fetching active flash sales" });
  }
};
