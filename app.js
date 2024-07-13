import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
const app = express();

import authRoute from "./routes/auth.route.js";

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use("/auth", authRoute);

export default app;
