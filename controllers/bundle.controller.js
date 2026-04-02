import Bundle from "../models/bundle.model.js";

// --- Admin Controls ---

// Create a new bundle
export const createBundle = async (req, res) => {
  try {
    const { name, mainProduct, additionalProducts, discountPercentage } = req.body;

    if (!name || !mainProduct || !additionalProducts || additionalProducts.length === 0) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newBundle = await Bundle.create({
      name,
      mainProduct,
      additionalProducts,
      discountPercentage: discountPercentage || 10,
    });

    const populated = await Bundle.findById(newBundle._id)
      .populate("mainProduct", "name image price objectId")
      .populate("additionalProducts", "name image price objectId");

    res.status(201).json({ message: "Bundle created successfully", bundle: populated });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Server error creating bundle" });
  }
};

// Get all bundles for admin panel
export const getAdminBundles = async (req, res) => {
  try {
    const bundles = await Bundle.find()
      .populate("mainProduct", "name image price")
      .populate("additionalProducts", "name image price")
      .sort({ createdAt: -1 });

    res.status(200).json({ bundles });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error fetching bundles" });
  }
};

// Update an existing bundle
export const updateBundle = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const bundle = await Bundle.findByIdAndUpdate(id, updateData, { new: true })
      .populate("mainProduct", "name image price")
      .populate("additionalProducts", "name image price");

    if (!bundle) {
      return res.status(404).json({ message: "Bundle not found" });
    }

    res.status(200).json({ message: "Bundle updated successfully", bundle });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error updating bundle" });
  }
};

// Delete a bundle
export const deleteBundle = async (req, res) => {
  try {
    const { id } = req.params;
    const bundle = await Bundle.findByIdAndDelete(id);

    if (!bundle) {
      return res.status(404).json({ message: "Bundle not found" });
    }

    res.status(200).json({ message: "Bundle deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error deleting bundle" });
  }
};

// --- Public Access ---

// Get active bundles for a specific main product
export const getActiveBundlesForProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const bundles = await Bundle.find({
      mainProduct: productId,
      isActive: true,
    })
      .populate("mainProduct", "name image price discount variants")
      .populate("additionalProducts", "name image price discount variants stock");

    res.status(200).json({ bundles });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error fetching bundles" });
  }
};
