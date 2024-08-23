import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import {
  changeUserPassword,
  updateUser,
  addAddress,
  updateAddress,
  getAddress,
  getUser,
} from "../controllers/user.controller.js";

const router = Router();

router.route("/get-user").get(verifyJwt, getUser);
router.route("/update-user").put(verifyJwt, updateUser);
router.route("/change-password").put(verifyJwt, changeUserPassword);
router.route("/add-address").post(verifyJwt, addAddress);
router.route("/update-address").put(verifyJwt, updateAddress);
router.route("/get-address").get(verifyJwt, getAddress);

export default router;
