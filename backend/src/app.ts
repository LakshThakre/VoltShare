import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authenticateSession } from './middleware/auth';
import { csrfOriginCheck } from './middleware/csrf';
import authRouter from './routes/auth';
import marketplaceRouter from './routes/marketplace';
import walletRouter from './routes/wallet';
import profileRouter from './routes/profile';

export const app = express();

// Trust proxy for rate limiting behind reverse proxies/containers
app.set('trust proxy', 1);

// Middleware stack
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow localhost, 127.0.0.1, or local dev clients
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CSRF Origin verification for state-changing requests
app.use(csrfOriginCheck);

// Global session authentication middleware (extracts & verifies session cookie)
app.use(authenticateSession);

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mount application API routes
app.use('/api/auth', authRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/profile', profileRouter);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});
