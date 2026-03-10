import { Router } from "express";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getRelatedProducts,
  searchProducts,
} from "../controllers/product.controller.js";

import { multerProductUpload } from "../middlewares/multer.middleware.js";

const router = Router();

router
  .route("/create-product")
  .post(verifyJwt, multerProductUpload.array("Images", 5), createProduct);
router.route("/get-products").get(getProducts);
router.route("/search").get(searchProducts);
router.route("/get-product/:id").get(getProductById);
router.route("/get-product/:id/related").get(getRelatedProducts);
router
  .route("/update-product/:id")
  .put(verifyJwt, multerProductUpload.array("Images", 5), updateProduct);
router.route("/delete-product/:id").delete(verifyJwt, deleteProduct);

export default router;


