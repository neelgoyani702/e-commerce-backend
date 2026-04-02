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
  getSalesReports,
  getCustomerSegments,
} from "../controllers/admin.controller.js";
import { getAllReturns, updateReturnStatus as updateReturn } from "../controllers/return.controller.js";

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
router.route("/returns").get(getAllReturns);
router.route("/returns/:id/status").put(updateReturn);
router.route("/reports/sales").get(getSalesReports);
router.route("/customers/segments").get(getCustomerSegments);

export default router;
