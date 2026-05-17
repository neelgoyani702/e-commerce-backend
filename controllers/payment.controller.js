import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/order.model.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * POST /payment/create-order
 * Creates a Razorpay order for the given amount (in INR paise).
 * Body: { amount } — amount in rupees (we convert to paise internally)
 */
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1, // Auto-capture: moves payment from "authorized" → "captured"
    };

    const razorpayOrder = await razorpay.orders.create(options);

    return res.status(201).json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Failed to create payment order" });
  }
};

/**
 * POST /payment/verify
 * Verifies the HMAC signature from Razorpay after payment.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, appOrderId }
 * appOrderId is our MongoDB Order _id to mark as paid.
 */
const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appOrderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    // Validate HMAC signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed — invalid signature" });
    }

    // Mark our Order as paid if appOrderId provided
    if (appOrderId) {
      await Order.findByIdAndUpdate(appOrderId, {
        paymentStatus: "paid",
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
      });
    }

    return res.status(200).json({ message: "Payment verified successfully", paymentId: razorpay_payment_id });
  } catch (error) {
    return res.status(500).json({ error: error.message, message: "Payment verification failed" });
  }
};

/**
 * Initiate a Razorpay refund (called internally by cancel/return controllers)
 * @param {string} paymentId - Razorpay payment_id (e.g. pay_XXXXX)
 * @param {number} amountInRupees - Amount to refund in rupees
 * @returns {{ success: boolean, refund?: object, error?: string }}
 */
const initiateRazorpayRefund = async (paymentId, amountInRupees) => {
  try {
    if (!paymentId) return { success: false, error: "No paymentId found" };

    // Step 1: Verify the payment is captured (refundable)
    const payment = await razorpay.payments.fetch(paymentId);
    if (!payment || !payment.captured) {
      console.warn(`[razorpay] Payment ${paymentId} not captured (status: ${payment?.status}). Cannot refund.`);
      return { success: false, error: `Payment not captured (status: ${payment?.status})` };
    }
    if (payment.status === "refunded") {
      console.log(`[razorpay] Payment ${paymentId} already fully refunded.`);
      return { success: true, refund: { id: "already_refunded" } };
    }

    // Step 2: Issue refund (amount in paise)
    const refundAmountPaise = Math.round(amountInRupees * 100);
    const maxRefundable = payment.amount - (payment.amount_refunded || 0);

    if (refundAmountPaise > maxRefundable) {
      console.warn(`[razorpay] Requested refund ₹${amountInRupees} exceeds max refundable ₹${maxRefundable / 100}. Capping.`);
    }

    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.min(refundAmountPaise, maxRefundable),
    });

    console.log(`[razorpay] Refund initiated: ₹${amountInRupees} on ${paymentId} → ${refund.id} (status: ${refund.status})`);
    return { success: true, refund };
  } catch (err) {
    const errMsg = err?.error?.description || err?.message || "Unknown refund error";
    console.error(`[razorpay] Refund failed for ${paymentId}: ${errMsg}`);
    return { success: false, error: errMsg };
  }
};

export { createRazorpayOrder, verifyRazorpayPayment, initiateRazorpayRefund };
