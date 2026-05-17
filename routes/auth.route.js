import { Router } from "express";
import { body } from "express-validator";
import { createUser, loginUser, logoutUser } from "../controllers/auth.controller.js";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

const router = Router();

const signupRules = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

const loginRules = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

router.route("/signup").post(signupRules, validate, createUser);
router.route("/login").post(loginRules, validate, loginUser);
router.route("/logout").get(verifyJwt, logoutUser);

export default router;
