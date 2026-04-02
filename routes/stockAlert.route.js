import { Router } from "express";
import {
  createAlert,
  getUserAlerts,
  deleteAlert,
  checkAlert,
} from "../controllers/stockAlert.controller.js";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";

const router = Router();

router.route("/").post(verifyJwt, createAlert);
router.route("/").get(verifyJwt, getUserAlerts);
router.route("/check").get(verifyJwt, checkAlert);
router.route("/:id").delete(verifyJwt, deleteAlert);

export default router;
