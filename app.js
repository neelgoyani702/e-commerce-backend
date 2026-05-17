import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";

const app = express();


import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import categoryRoute from "./routes/category.route.js";
import productRoute from "./routes/product.route.js";
import cartRoute from "./routes/cart.route.js";
import orderRoute from "./routes/order.route.js";
import paymentRoute from "./routes/payment.route.js";
import adminRoute from "./routes/admin.route.js";
import settingsRoute from "./routes/settings.route.js";
import reviewRoute from "./routes/review.route.js";
import couponRoute from "./routes/coupon.route.js";
import returnRoute from "./routes/return.route.js";
import stockAlertRoute from "./routes/stockAlert.route.js";
import questionRoute from "./routes/question.route.js";
import flashSaleRoute from "./routes/flashSale.route.js";
import bundleRoute from "./routes/bundle.route.js";
import bulkRoute from "./routes/bulk.route.js";

// ── Security Middleware ─────────────────────────────────────
// Secure HTTP headers
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: "Too many attempts, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: "Too many requests, please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsers
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    credentials: true,
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "5mb",
  })
);

// NoSQL injection prevention — strip $ and . from req.body, params, query
app.use(mongoSanitize());

app.use(express.static("uploads"));

// ── Routes ────────────────────────────────────────────────
app.use("/auth", authLimiter, authRoute);
app.use("/user", apiLimiter, userRoute);
app.use("/category", categoryRoute);
app.use("/product", productRoute);
app.use("/cart", cartRoute);
app.use("/order", orderRoute);
app.use("/payment", paymentRoute);
app.use("/admin", adminRoute);
app.use("/settings", settingsRoute);
app.use("/review", reviewRoute);
app.use("/coupon", couponRoute);
app.use("/returns", returnRoute);
app.use("/stock-alerts", stockAlertRoute);
app.use("/questions", questionRoute);
app.use("/flash-sales", flashSaleRoute);
app.use("/bundle", bundleRoute);
app.use("/bulk", bulkRoute);

export default app;
