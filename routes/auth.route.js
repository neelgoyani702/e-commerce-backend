import { Router } from "express";
import { createUser, loginUser,logoutUser } from "../controllers/auth.controller.js";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";

const router = Router();

router.route("/signup").post(createUser);

router.route("/login").post(loginUser);

router.route("/logout").get(verifyJwt,logoutUser);

export default router;
