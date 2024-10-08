import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import {
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts
} from "../controllers/category.controller.js";

import { multerCategoryUpload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/get-category").get(getCategory);
router.route("/:id/products").get(getCategoryProducts);
router
  .route("/create-category")
  .post(verifyJwt, multerCategoryUpload.single("Image"), createCategory);
router
  .route("/update-category/:id")
  .put(verifyJwt, multerCategoryUpload.single("Image"), updateCategory);

router.route("/delete-category/:id").delete(verifyJwt, deleteCategory);

export default router;

