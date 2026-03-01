import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.middleware.js";
import {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  updateOrderStatus,
  getActivityLog,
  getLowStockProducts,
  getCustomerInsights,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/admin.controller.js";

const router = Router();

// All routes require authentication + admin role
router.use(verifyJwt, verifyAdmin);

router.route("/stats").get(getDashboardStats);
router.route("/users").get(getAllUsers);
router.route("/users/:id/role").put(updateUserRole);
router.route("/users/:id/insights").get(getCustomerInsights);
router.route("/orders/:id/status").put(updateOrderStatus);
router.route("/activity-log").get(getActivityLog);
router.route("/low-stock").get(getLowStockProducts);
router.route("/coupons").get(getCoupons).post(createCoupon);
router.route("/coupons/:id").put(updateCoupon).delete(deleteCoupon);

export default router;
