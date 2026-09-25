import { Router, Request, Response } from 'express';

export const authRouter = Router();

authRouter.get('/me', (req: Request, res: Response) => {
  if (req.user) {
    res.json({
      success: true,
      user: {
        uid: req.user.uid,
        email: req.user.email,
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Unauthenticated user',
    });
  }
});
