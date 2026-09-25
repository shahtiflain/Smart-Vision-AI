import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { processOcr } from '../services/ocrService';
import { imageValidator } from '../utils/validators';

export const ocrRouter = Router();

const readSchema = z.object({
  image: imageValidator,
});

ocrRouter.post('/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image } = readSchema.parse(req.body);

    const result = await processOcr(image);
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error("OCR API Validation Error:", error);
      return res.status(400).json({
        success: false,
        error: 'Invalid input data. Please try again.',
        response: 'Invalid input data.',
      });
    }
    
    console.error("OCR API Error Details:", {
      message: error.message,
      status: error.status || error.code,
      fullError: error
    });
    
    res.status(500).json({
      success: false,
      error: error.message && error.message.includes('Timeout') ? 'The request timed out. Please try again.' : 'An error occurred while reading the text. Please try again.',
      response: 'An error occurred while reading the text.',
    });
  }
});
