import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Preferences } from '../models/Preferences';

export const preferencesRouter = Router();

const preferencesSchema = z.object({
  speechRate: z.number().min(0.5).max(2.0).optional(),
  verbosity: z.enum(['short', 'detailed']).optional(),
});

preferencesRouter.get('/', async (req: Request, res: Response) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ success: false, error: 'Auth required' });
  }

  try {
    let prefs = await Preferences.findOne({ uid: req.user.uid });
    if (!prefs) {
      // Sensible defaults when none saved
      prefs = new Preferences({ uid: req.user.uid, speechRate: 1.0, verbosity: 'short' });
    }
    res.json({ success: true, preferences: { speechRate: prefs.speechRate, verbosity: prefs.verbosity } });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
  }
});

preferencesRouter.put('/', async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ success: false, error: 'Auth required' });
  }

  try {
    const parsed = preferencesSchema.parse(req.body);
    
    const prefs = await Preferences.findOneAndUpdate(
      { uid: req.user.uid },
      { $set: parsed },
      { new: true, upsert: true }
    );
    
    res.json({ success: true, preferences: { speechRate: prefs.speechRate, verbosity: prefs.verbosity } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid preferences' });
    }
    console.error('Error saving preferences:', error);
    res.status(500).json({ success: false, error: 'Failed to save preferences' });
  }
});
