import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Never log images or base64
  const safeBody = req.body ? { ...req.body, image: req.body.image ? '[REDACTED]' : undefined } : undefined;
  
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error Details:', err);
    console.error('Request Body:', safeBody);
  } else {
    // In production, log a safer version without stack trace if possible
    console.error(`[Error] ${err.name}: ${err.message}`);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: process.env.NODE_ENV === 'production' ? 'Invalid input data' : (err as any).errors,
    });
  }

  // Never show raw model errors, mongo errors, or firebase errors to users
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};
