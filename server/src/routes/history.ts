import { Router, Request, Response } from 'express';
import { History } from '../models/History';

export const historyRouter = Router();

historyRouter.get('/', async (req: Request, res: Response) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ success: false, error: 'Authentication required to view history' });
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

  try {
    const history = await History.find({ uid: req.user.uid })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

historyRouter.delete('/', async (req: Request, res: Response) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ success: false, error: 'Auth required' });
  }

  try {
    await History.deleteMany({ uid: req.user.uid });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting history:', error);
    res.status(500).json({ success: false, error: 'Failed to delete history' });
  }
});
