import { callGeminiVision } from '../utils/geminiHelper';

export async function processOcr(image: string) {
  const prompt = "Extract all visible text in natural reading order. Fix arbitrary line-break artifacts so sentences flow naturally. Do not guess unclear words; write '[unclear]' instead. If there is no readable text, say 'I couldn't find any readable text. Try moving closer or improving the lighting.'";
  
  const responseText = await callGeminiVision(image, prompt);
  let spokenResponse = responseText;

  // Check if the text looks like medicine, dosage, or a safety notice
  const safetyRegex = /\b(medicine|dosage|mg|safety|caution|warning|prescription|rx|tablet|capsule|take \d)\b/i;
  if (safetyRegex.test(responseText)) {
    spokenResponse = responseText + " Please have someone verify this.";
  }

  return {
    success: true,
    intent: 'read_text',
    response: spokenResponse,
    confidence: 1.0,
    objects: [],
    text: responseText
  };
}
