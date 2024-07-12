import express from 'express';
const app = express();

import authRoute from './routes/auth.route.js';

app.use(express.json());

app.use('/auth', authRoute);

export default app;