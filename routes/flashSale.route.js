import { Router } from "express";
import {
  createFlashSale,
  getAdminFlashSales,
  updateFlashSale,
  deleteFlashSale,
  getActiveFlashSales,
} from "../controllers/flashSale.controller.js";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.middleware.js";

const router = Router();

// Public Routes
router.route("/active").get(getActiveFlashSales);

// Admin Routes
router.route("/").post(verifyJwt, verifyAdmin, createFlashSale);
router.route("/").get(verifyJwt, verifyAdmin, getAdminFlashSales);
router.route("/:id").put(verifyJwt, verifyAdmin, updateFlashSale);
router.route("/:id").delete(verifyJwt, verifyAdmin, deleteFlashSale);

export default router;
