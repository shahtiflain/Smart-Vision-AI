import { Request, Response, NextFunction } from 'express';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Extend Express Request to include a user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      if (getApps().length > 0) {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        req.user = decodedToken;
      } else {
        console.warn('Firebase Admin not initialized, skipping strict token validation.');
        // For testing environments where Firebase isn't set up yet, we could mock user
      }
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token. Please log in again.'
      });
    }
  }

  // If no token or successfully verified, continue.
  // The app supports guest mode, so we don't throw 401 if authHeader is absent.
  next();
}
