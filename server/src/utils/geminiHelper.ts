import { GoogleGenAI } from '@google/genai';

export async function callGeminiVision(base64ImageStr: string, prompt: string, config?: any): Promise<string> {
  const API_KEY = process.env.GEMINI_API_KEY || '';
  const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  let base64Data = base64ImageStr;
  let mimeType = 'image/jpeg';
  if (base64ImageStr.startsWith('data:')) {
    const parts = base64ImageStr.split(',');
    if (parts.length === 2) {
      const header = parts[0];
      const match = header.match(/data:([^;]+);/);
      if (match) {
        mimeType = match[1];
      }
      base64Data = parts[1];
    }
  }

  const contentReq = ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType } }
        ]
      }
    ],
    config: config
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Timeout: Gemini API took too long to respond.'));
    }, 20000);
  });

  const result = (await Promise.race([contentReq, timeoutPromise])) as any;
  return result.text;
}
