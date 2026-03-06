import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import {
  createReview,
  getProductReviews,
  deleteReview,
  canReview,
} from "../controllers/review.controller.js";

const router = Router();

router.route("/can-review/:productId").get(verifyJwt, canReview);
router.route("/:productId").post(verifyJwt, createReview);
router.route("/:productId").get(getProductReviews);
router.route("/:id").delete(verifyJwt, deleteReview);

export default router;
