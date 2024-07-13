import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import {
  changeUserPassword,
  updateUser,
  addAddress,
  updateAddress
} from "../controllers/user.controller.js";

const router = Router();

router.route("/update-user").put(verifyJwt, updateUser);
router.route("/change-password").put(verifyJwt, changeUserPassword);
router.route("/add-address").put(verifyJwt, addAddress);
router.route("/update-address").put(verifyJwt, updateAddress);

export default router;
