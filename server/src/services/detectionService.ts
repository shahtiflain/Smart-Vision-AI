import { callGeminiVision } from '../utils/geminiHelper';
import { Type, Schema } from '@google/genai';
import { z } from 'zod';

const detectionResultSchema = z.object({
  unclear: z.boolean(),
  objects: z.array(z.object({
    label: z.string(),
    position: z.enum(["left", "center", "right"]),
    nearness: z.enum(["near", "medium", "far"]),
    certainty: z.enum(["high", "medium", "low"])
  })).max(8)
});

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    unclear: { type: Type.BOOLEAN },
    objects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          position: { type: Type.STRING, enum: ["left", "center", "right"] },
          nearness: { type: Type.STRING, enum: ["near", "medium", "far"] },
          certainty: { type: Type.STRING, enum: ["high", "medium", "low"] }
        },
        required: ["label", "position", "nearness", "certainty"]
      }
    }
  },
  required: ["unclear", "objects"]
};

export async function processDetection(image: string) {
  const prompt = "Analyze the image and return a JSON object. Only list clearly visible objects. Never invent or hallucinate objects. Do not use distances in meters. Do not make safety claims. If the image is too dark, blurry, or nothing is clearly identifiable, set 'unclear' to true. Limit to at most 8 objects.";

  const responseText = await callGeminiVision(image, prompt, {
    responseMimeType: "application/json",
    responseSchema: responseSchema
  });

  const parsedData = JSON.parse(responseText);
  const parsed = detectionResultSchema.parse(parsedData);

  let spokenResponse = "";
  if (parsed.unclear) {
    spokenResponse = "The image is too dark or blurry to clearly identify objects.";
  } else if (parsed.objects.length === 0) {
    spokenResponse = "I couldn't identify any specific objects ahead.";
  } else {
    const parts = parsed.objects.map(obj => {
      let text = "";
      if (obj.certainty === "low") text += "possibly a ";
      else text += "a ";
      
      text += obj.label;
      
      if (obj.position === "center") {
        text += " ahead";
      } else {
        text += ` to your ${obj.position}`;
      }
      
      if (obj.nearness === "near") text += ", nearby";
      else if (obj.nearness === "far") text += ", in the distance";
      
      return text;
    });
    
    if (parts.length === 1) {
      spokenResponse = `I can see ${parts[0]}.`;
    } else {
      const last = parts.pop();
      spokenResponse = `I can see ${parts.join(', ')}, and ${last}.`;
    }
    spokenResponse += " This may not show everything.";
  }

  return {
    success: true,
    intent: 'object_detection',
    response: spokenResponse,
    confidence: 1.0,
    objects: parsed.objects,
    text: null
  };
}
