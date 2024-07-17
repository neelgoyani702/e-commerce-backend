import { Router } from "express";

import {
  getOrders,
  placeOrder,
  cancelOrder,
} from "../controllers/order.controller.js";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";

const router = Router();

router.route("/").get(verifyJwt, getOrders);
router.route("/").post(verifyJwt, placeOrder);
router.route("/:id").delete(verifyJwt, cancelOrder);

export default router;
