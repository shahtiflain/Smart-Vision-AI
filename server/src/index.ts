import express from 'express';
import corsMiddleware from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { healthRouter } from './routes/health';
import { visionRouter } from './routes/vision';
import { ocrRouter } from './routes/ocr';
import { detectionRouter } from './routes/detection';
import { assistantRouter } from './routes/assistant';
import { authRouter } from './routes/auth';
import { historyRouter } from './routes/history';
import { preferencesRouter } from './routes/preferences';
import { errorHandler } from './middlewares/errorHandler';
import { authMiddleware } from './middlewares/authMiddleware';
import { historyMiddleware } from './middlewares/historyMiddleware';
import { aiRateLimiter, generalRateLimiter, globalDailyCapMiddleware } from './middlewares/rateLimitMiddleware';
import { initializeFirebaseAdmin } from './utils/firebaseAdmin';
import { connectDB } from './utils/db';

dotenv.config();

// Startup Checks
const requiredEnvVars = ['GEMINI_API_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`Startup Error: Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

initializeFirebaseAdmin();
connectDB();

const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1); // For Vercel/Render
app.use(helmet());

// CORS restriction
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(corsMiddleware({
  origin: (origin, callback) => {
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json({ limit: '2mb' })); // Keep small as possible

// Auth Middleware (global)
app.use(authMiddleware);

app.use('/health', healthRouter);
app.use('/api', authRouter);
app.use('/api/history', generalRateLimiter, historyRouter);
app.use('/api/preferences', generalRateLimiter, preferencesRouter);

// Apply history middleware and AI rate limiters
app.use('/api/vision', globalDailyCapMiddleware, aiRateLimiter, historyMiddleware, visionRouter);
app.use('/api/ocr', globalDailyCapMiddleware, aiRateLimiter, historyMiddleware, ocrRouter);
app.use('/api/detection', globalDailyCapMiddleware, aiRateLimiter, historyMiddleware, detectionRouter);
app.use('/api/assistant', globalDailyCapMiddleware, aiRateLimiter, historyMiddleware, assistantRouter);

// Centralized error handler
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
