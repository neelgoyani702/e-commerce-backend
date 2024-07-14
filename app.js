import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
const app = express();

import { sendEmail } from "./services/mail.service.js";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import categoryRoute from "./routes/category.route.js";

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "5mb",
  })
);
app.use(express.static("uploads"));

app.use("/auth", authRoute);
app.use("/user", userRoute);
app.use("/category", categoryRoute);

export default app;
