import { Router } from "express";

import {
  getOrders,
  placeOrder,
  cancelOrder,
  deliveredOrder,
  orderHistory,
  getAllOrders,
} from "../controllers/order.controller.js";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";

const router = Router();

router.route("/").get(verifyJwt, getOrders);
router.route("/").post(verifyJwt, placeOrder);
router.route("/history").get(verifyJwt, orderHistory);
router.route("/all").get(verifyJwt, getAllOrders);
router.route("/:id").delete(verifyJwt, cancelOrder);
router.route("/:id/deliver").put(verifyJwt, deliveredOrder);

export default router;
