import { Router } from "express";
const router = Router();
import {
  createCustomer,
  addCard,
  chargeCard,
} from "../controllers/payment.controller.js";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";

router.route("/create-customer").post(verifyJwt, createCustomer);
router.route("/add-card").post(addCard);
router.route("/charge-card").post(chargeCard);

export default router;
