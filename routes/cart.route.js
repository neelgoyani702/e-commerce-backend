import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import {
  getCart,
  addToCart,
  updateCart,
  deleteCart,
} from "../controllers/cart.controller.js";

const router = Router();

router.route("/").post(verifyJwt, addToCart);
router.route("/").get(verifyJwt, getCart);
router.route("/").put(verifyJwt, updateCart);
router.route("/:productId").delete(verifyJwt, deleteCart);

export default router;
