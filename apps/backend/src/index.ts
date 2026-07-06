import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@RideForge/shared';
import { ratingsRouter } from './modules/ratings/ratings.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger } from './config/logger';

import { authRouter }    from './modules/auth/auth.routes';
import { ridesRouter }   from './modules/rides/rides.routes';
import { driversRouter } from './modules/drivers/drivers.routes';
import { paymentsRouter } from './modules/payments/payments.routes';
import { adminRouter }   from './modules/admin/admin.routes';
import { setupSocket }   from './socket/socket.handler';

const app = express();
const httpServer = createServer(app);

export const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: [
      process.env.RIDER_APP_URL  || 'http://localhost:5173',
      process.env.DRIVER_APP_URL || 'http://localhost:5174',
      process.env.ADMIN_URL      || 'http://localhost:5175',
    ],
    credentials: true,
  },
});

app.use(helmet());
app.use(cors({
  origin: [
    process.env.RIDER_APP_URL  || 'http://localhost:5173',
    process.env.DRIVER_APP_URL || 'http://localhost:5174',
    process.env.ADMIN_URL      || 'http://localhost:5175',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many auth attempts, please try again later',
}));

app.use('/api/auth',     authRouter);
app.use('/api/rides',    ridesRouter);
app.use('/api/drivers',  driversRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin',    adminRouter);
app.use('/api/ratings', ratingsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

setupSocket(io);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
});