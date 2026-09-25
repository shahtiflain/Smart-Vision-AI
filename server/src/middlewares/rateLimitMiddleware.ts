import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Global Daily Cap Logic
let dailyAiRequests = 0;
let lastResetDay = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });

export function globalDailyCapMiddleware(req: Request, res: Response, next: NextFunction) {
  const currentDay = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
  if (currentDay !== lastResetDay) {
    dailyAiRequests = 0;
    lastResetDay = currentDay;
  }

  const dailyCap = parseInt(process.env.DAILY_GLOBAL_CAP || '1000', 10);
  
  if (dailyAiRequests >= dailyCap) {
    return res.status(429).json({
      success: false,
      code: 'daily_cap_reached',
      error: 'The assistant has reached its daily limit. Please try again later.'
    });
  }

  // Increment on successful handling or at least when passing middleware?
  // We'll increment it as it passes the middleware before hitting Gemini.
  dailyAiRequests++;
  next();
}

// AI Rate Limiter: Per user if signed in, per IP if guest
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: async (req: Request, res: Response) => {
    if (req.user && req.user.uid) {
      return parseInt(process.env.RATE_LIMIT_USER_PER_MIN || '10', 10);
    }
    return parseInt(process.env.RATE_LIMIT_GUEST_PER_MIN || '3', 10);
  },
  keyGenerator: (req: Request) => {
    if (req.user && req.user.uid) {
      return req.user.uid;
    }
    // Default to IP
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response, next: NextFunction, options) => {
    res.status(429).json({
      success: false,
      code: 'rate_limited',
      error: "You're going a bit fast. Please wait a few seconds and try again.",
      retryAfterSeconds: Math.ceil(options.windowMs / 1000)
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General Rate Limiter (for history, preferences, etc.)
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60, // 60 per minute
  keyGenerator: (req: Request) => {
    if (req.user && req.user.uid) return req.user.uid;
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response, next: NextFunction, options) => {
    res.status(429).json({
      success: false,
      code: 'rate_limited',
      error: "Too many requests.",
      retryAfterSeconds: Math.ceil(options.windowMs / 1000)
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});
