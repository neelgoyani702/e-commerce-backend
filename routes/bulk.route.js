import { Router } from "express";
import multer from "multer";
import { verifyJwt } from "../middlewares/verifyJWT.middleware.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.middleware.js";
import { exportProductsCsv, importProductsCsv } from "../controllers/bulk.controller.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyJwt, verifyAdmin);

router.get("/export/products", exportProductsCsv);
router.post("/import/products", upload.single("csvFile"), importProductsCsv);

export default router;
