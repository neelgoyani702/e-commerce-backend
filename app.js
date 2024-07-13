import express from 'express';
import cookieParser from 'cookie-parser';
const app = express();

import authRoute from './routes/auth.route.js';

app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRoute);

export default app;