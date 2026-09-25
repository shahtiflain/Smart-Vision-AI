import { Request, Response, NextFunction } from 'express';
import { History } from '../models/History';

export function historyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.uid) {
    return next(); // Guest users: store nothing
  }

  const originalJson = res.json;

  res.json = function(body: any) {
    if (body && body.success && body.intent && body.response) {
      // Save history record asynchronously
      const question = req.body && req.body.question ? req.body.question : undefined;
      
      History.create({
        uid: req.user.uid,
        intent: body.intent,
        question: question,
        response: body.response,
        confidence: body.confidence || 1.0,
      }).catch(err => {
        // A DB failure must never break the AI response (log it and continue)
        console.error('Failed to save history:', err);
      });
    }
    
    return originalJson.call(this, body);
  };

  next();
}
