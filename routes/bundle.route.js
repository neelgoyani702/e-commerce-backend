import express from "express";
import {
  createBundle,
  getAdminBundles,
  updateBundle,
  deleteBundle,
  getActiveBundlesForProduct,
} from "../controllers/bundle.controller.js";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.middleware.js";

const router = express.Router();

// --- Admin routes (Protected) ---
router.post("/admin", verifyJwt, verifyAdmin, createBundle);
router.get("/admin", verifyJwt, verifyAdmin, getAdminBundles);
router.put("/admin/:id", verifyJwt, verifyAdmin, updateBundle);
router.delete("/admin/:id", verifyJwt, verifyAdmin, deleteBundle);

// --- Public Access ---
router.get("/active/:productId", getActiveBundlesForProduct);

export default router;
