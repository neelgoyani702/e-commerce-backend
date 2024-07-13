import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
const app = express();

import { sendEmail } from "./services/mail.service.js";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use("/auth", authRoute);
app.use("/user", userRoute);

export default app;
