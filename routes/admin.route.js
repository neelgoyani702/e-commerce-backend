import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.middleware.js";
import {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  updateOrderStatus,
  getActivityLog,
} from "../controllers/admin.controller.js";

const router = Router();

// All routes require authentication + admin role
router.use(verifyJwt, verifyAdmin);

router.route("/stats").get(getDashboardStats);
router.route("/users").get(getAllUsers);
router.route("/users/:id/role").put(updateUserRole);
router.route("/orders/:id/status").put(updateOrderStatus);
router.route("/activity-log").get(getActivityLog);

export default router;
