import Coupon from "../models/coupon.model.js";

// Validate and apply a coupon code
const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Please enter a coupon code" });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ message: "This coupon is no longer active" });
    }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ message: "This coupon has expired" });
    }

    // Check usage limit
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ message: "This coupon has reached its usage limit" });
    }

    // Check minimum order amount
    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = Math.round((orderAmount * coupon.discountValue) / 100);
    } else {
      discount = coupon.discountValue;
    }

    // Discount cannot exceed order amount
    discount = Math.min(discount, orderAmount);

    res.status(200).json({
      message: "Coupon applied successfully!",
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error validating coupon" });
  }
};

export { validateCoupon };
