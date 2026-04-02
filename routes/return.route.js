import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import {
  createReturn,
  getUserReturns,
  cancelReturn,
} from "../controllers/return.controller.js";

const router = Router();

router.route("/").post(verifyJwt, createReturn);
router.route("/").get(verifyJwt, getUserReturns);
router.route("/:id").delete(verifyJwt, cancelReturn);

export default router;
