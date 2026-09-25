import { callGeminiVision } from '../utils/geminiHelper';

export async function processAnalyze(image: string, verbosity: 'short'|'detailed' = 'short') {
  const sentences = verbosity === 'detailed' ? 5 : 3;
  const prompt = `Describe this scene in ${sentences} sentences max. Be cautious and do not claim areas are definitively safe. Use relative positions (left, right, ahead) instead of distances in meters. Say so if the image is unclear.`;
  const responseText = await callGeminiVision(image, prompt);
  
  return {
    success: true,
    intent: 'scene_description',
    response: responseText,
    confidence: 1.0,
    objects: [],
    text: responseText
  };
}

export async function processQuestion(image: string, question: string, verbosity: 'short'|'detailed' = 'short') {
  const sentences = verbosity === 'detailed' ? 5 : 2;
  const prompt = `Question: ${question}\nAnswer in max ${sentences} sentences. Be cautious and do not claim areas are definitively safe. Use relative positions instead of distances. Say so if the image doesn't show the answer or is unclear.`;
  const responseText = await callGeminiVision(image, prompt);
  
  return {
    success: true,
    intent: 'visual_question',
    response: responseText,
    confidence: 1.0,
    objects: [],
    text: responseText
  };
}
