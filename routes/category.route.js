import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";

import {
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";

import { multerUpload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/get-category").get(getCategory);
router
  .route("/create-category")
  .post(verifyJwt, multerUpload.single("Image"), createCategory);

router
  .route("/update-category/:id")
  .put(verifyJwt, multerUpload.single("Image"), updateCategory);

router.route("/delete-category/:id").delete(verifyJwt, deleteCategory);

export default router;
