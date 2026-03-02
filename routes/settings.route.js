import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.middleware.js";
import {
  getStoreSettings,
  updateStoreSettings,
} from "../controllers/settings.controller.js";

const router = Router();

// Public - anyone can read settings (footer, navbar, etc.)
router.route("/").get(getStoreSettings);

// Admin only - update settings
router.route("/").put(verifyJwt, verifyAdmin, updateStoreSettings);

export default router;
