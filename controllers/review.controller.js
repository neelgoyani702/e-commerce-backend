import Review from "../models/review.model.js";
import Product from "../models/products.model.js";
import Order from "../models/order.model.js";

// Create or update a review — only for verified buyers with delivered orders
const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Verify user has a delivered order containing this product
    const deliveredOrder = await Order.findOne({
      userId,
      status: "delivered",
      "products.productId": productId,
    });

    if (!deliveredOrder) {
      return res.status(403).json({
        message: "You can only review products from your delivered orders",
      });
    }

    // Upsert: create or update existing review
    const review = await Review.findOneAndUpdate(
      { userId, productId },
      { rating: Number(rating), comment: comment?.trim() || "" },
      { new: true, upsert: true, runValidators: true }
    );

    // Calculate new average rating
    const stats = await Review.aggregate([
      { $match: { productId: product._id } },
      {
        $group: {
          _id: "$productId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      message: review.createdAt === review.updatedAt ? "Review submitted" : "Review updated",
      review,
      stats: stats[0] || { averageRating: 0, totalReviews: 0 },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }
    res.status(500).json({ error: error.message, message: "Error submitting review" });
  }
};

// Check if user can review a product (has delivered order with this product)
const canReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const deliveredOrder = await Order.findOne({
      userId,
      status: "delivered",
      "products.productId": productId,
    });

    res.status(200).json({
      canReview: !!deliveredOrder,
    });
  } catch (error) {
    res.status(500).json({ error: error.message, canReview: false });
  }
};

// Get all reviews for a product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const [reviews, stats] = await Promise.all([
      Review.find({ productId })
        .populate("userId", "firstName lastName")
        .sort({ createdAt: -1 }),
      Review.aggregate([
        { $match: { productId: (await Product.findById(productId))?._id } },
        {
          $group: {
            _id: "$productId",
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Rating distribution (1-5 stars count)
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    res.status(200).json({
      message: "Reviews fetched",
      reviews,
      stats: stats[0] || { averageRating: 0, totalReviews: 0 },
      distribution,
    });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error fetching reviews" });
  }
};

// Delete own review
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You can only delete your own reviews" });
    }

    await Review.findByIdAndDelete(id);

    res.status(200).json({ message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error deleting review" });
  }
};

export { createReview, getProductReviews, deleteReview, canReview };
