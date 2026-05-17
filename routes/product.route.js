import { Router } from "express";
import { body } from "express-validator";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
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

const productRules = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("price").isFloat({ gt: 0 }).withMessage("Price must be a positive number"),
  body("discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100"),
];

router
  .route("/create-product")
  .post(verifyJwt, multerProductUpload.array("Images", 5), productRules, validate, createProduct);
router.route("/get-products").get(getProducts);
router.route("/search").get(searchProducts);
router.route("/get-product/:id").get(getProductById);
router.route("/get-product/:id/related").get(getRelatedProducts);
router
  .route("/update-product/:id")
  .put(verifyJwt, multerProductUpload.array("Images", 5), productRules, validate, updateProduct);
router.route("/delete-product/:id").delete(verifyJwt, deleteProduct);

export default router;


