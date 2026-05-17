import { Router } from "express";
const router = Router();
import { createRazorpayOrder, verifyRazorpayPayment } from "../controllers/payment.controller.js";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import { body } from "express-validator";
import { validate } from "../middlewares/validate.middleware.js";

// Create a Razorpay order (requires auth — amount from their cart)
router.route("/create-order").post(
  verifyJwt,
  [body("amount").isFloat({ gt: 0 }).withMessage("Amount must be positive")],
  validate,
  createRazorpayOrder
);

// Verify payment signature (requires auth)
router.route("/verify").post(verifyJwt, verifyRazorpayPayment);

export default router;
