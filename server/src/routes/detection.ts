import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { processDetection } from '../services/detectionService';
import { imageValidator } from '../utils/validators';

export const detectionRouter = Router();

const detectionRequestSchema = z.object({
  image: imageValidator,
});

detectionRouter.post('/objects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image } = detectionRequestSchema.parse(req.body);
    const result = await processDetection(image);
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error("Detection Zod Error:", error);
      return res.status(400).json({
        success: false,
        error: 'Invalid response format or input data.',
        response: 'An error occurred while identifying objects.',
      });
    }

    console.error("Detection API Error:", error);

    res.status(500).json({
      success: false,
      error: error.message && error.message.includes('Timeout') ? 'The analysis timed out. Please try again.' : 'An error occurred while detecting objects. Please try again.',
      response: 'An error occurred while identifying objects.',
    });
  }
});
