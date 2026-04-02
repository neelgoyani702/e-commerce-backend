import { Router } from "express";

import {
  getOrders,
  placeOrder,
  cancelOrder,
  updateOrderStatus,
  orderHistory,
  getAllOrders,
} from "../controllers/order.controller.js";
import { generateInvoice } from "../controllers/invoice.controller.js";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";

const router = Router();

router.route("/").get(verifyJwt, getOrders);
router.route("/").post(verifyJwt, placeOrder);
router.route("/history").get(verifyJwt, orderHistory);
router.route("/all").get(verifyJwt, getAllOrders);
router.route("/:id/invoice").get(verifyJwt, generateInvoice);
router.route("/:id").delete(verifyJwt, cancelOrder);
router.route("/:id/status").put(verifyJwt, updateOrderStatus);

export default router;

