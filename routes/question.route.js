import { Router } from "express";
import {
  addQuestion,
  answerQuestion,
  getProductQuestions,
  deleteQuestion,
} from "../controllers/question.controller.js";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";

const router = Router();

router.route("/product/:productId").get(getProductQuestions);
router.route("/").post(verifyJwt, addQuestion);
router.route("/:questionId/answer").post(verifyJwt, answerQuestion);
router.route("/:questionId").delete(verifyJwt, deleteQuestion);

export default router;
