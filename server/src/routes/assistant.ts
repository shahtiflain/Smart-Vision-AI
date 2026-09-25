import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { imageValidator } from '../utils/validators';
import { processAnalyze, processQuestion } from '../services/visionService';
import { processOcr } from '../services/ocrService';
import { processDetection } from '../services/detectionService';

export const assistantRouter = Router();

const assistantSchema = z.object({
  image: imageValidator,
  question: z.string().optional(),
  verbosity: z.enum(['short', 'detailed']).optional().default('short')
});

assistantRouter.post('/query', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image, question, verbosity } = assistantSchema.parse(req.body);

    let intent = 'scene_description';
    
    if (question && question.trim().length > 0) {
      const q = question.toLowerCase();
      if (q.match(/\b(read|what does it say|text|label|sign)\b/)) {
        intent = 'read_text';
      } else if (q.match(/\b(in front of me|what's ahead|what's around|obstacle|any objects|what is ahead)\b/)) {
        intent = 'object_detection';
      } else if (q.match(/\b(describe|surroundings|where am i|what's happening)\b/)) {
        intent = 'scene_description';
      } else {
        intent = 'visual_question';
      }
    }

    let result;
    switch (intent) {
      case 'read_text':
        result = await processOcr(image);
        break;
      case 'object_detection':
        result = await processDetection(image);
        break;
      case 'scene_description':
        result = await processAnalyze(image, verbosity);
        break;
      case 'visual_question':
      default:
        result = await processQuestion(image, question || "", verbosity);
        break;
    }

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error("Assistant API Validation Error:", error);
      return res.status(400).json({
        success: false,
        error: 'Invalid input data. Please try again.',
        response: 'Invalid input data.',
      });
    }
    
    console.error("Assistant API Error:", error);
    
    res.status(500).json({
      success: false,
      error: error.message && error.message.includes('Timeout') ? 'The request timed out. Please try again.' : 'An error occurred. Please try again.',
      response: 'An error occurred while processing your request.',
    });
  }
});
