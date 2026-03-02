import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getRelatedProducts,
} from "../controllers/product.controller.js";

import { multerProductUpload } from "../middlewares/multer.middleware.js";

const router = Router();

router
  .route("/create-product")
  .post(verifyJwt, multerProductUpload.single("Image"), createProduct);
router.route("/get-products").get(getProducts);
router.route("/get-product/:id").get(getProductById);
router.route("/get-product/:id/related").get(getRelatedProducts);
router
  .route("/update-product/:id")
  .put(verifyJwt, multerProductUpload.single("Image"), updateProduct);
router.route("/delete-product/:id").delete(verifyJwt, deleteProduct);

export default router;

