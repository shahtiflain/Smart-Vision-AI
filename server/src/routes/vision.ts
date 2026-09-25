import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { processAnalyze, processQuestion } from '../services/visionService';
import { imageValidator } from '../utils/validators';

export const visionRouter = Router();

const analyzeSchema = z.object({
  image: imageValidator,
  verbosity: z.enum(['short', 'detailed']).optional().default('short')
});

const questionSchema = z.object({
  image: imageValidator,
  question: z.string().min(1, "Question is required").max(500, "Question is too long"),
  verbosity: z.enum(['short', 'detailed']).optional().default('short')
});

visionRouter.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image, verbosity } = analyzeSchema.parse(req.body);

    const result = await processAnalyze(image, verbosity);
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(error);
    }
    
    console.error("Vision API Error:", error);
    
    res.status(500).json({
      success: false,
      error: error.message && error.message.includes('Timeout') ? 'The analysis timed out. Please try again.' : 'An error occurred while analyzing the image. Please try again.',
      response: 'An error occurred while analyzing the image.',
    });
  }
});

visionRouter.post('/question', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image, question, verbosity } = questionSchema.parse(req.body);

    const result = await processQuestion(image, question, verbosity);
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error("Vision API Validation Error:", error);
      return res.status(400).json({
        success: false,
        error: 'Invalid input data. Please try again.',
        response: 'Invalid input data.',
      });
    }
    
    console.error("Vision API Error Details:", {
      message: error.message,
      status: error.status || error.code,
      fullError: error
    });
    
    res.status(500).json({
      success: false,
      error: error.message && error.message.includes('Timeout') ? 'The request timed out. Please try again.' : 'An error occurred while answering your question. Please try again.',
      response: 'An error occurred while answering your question.',
    });
  }
});
