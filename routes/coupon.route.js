import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import { validateCoupon } from "../controllers/coupon.controller.js";

const router = Router();

router.route("/validate").post(verifyJwt, validateCoupon);

export default router;
