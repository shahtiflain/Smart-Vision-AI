import { z } from 'zod';

export const imageValidator = z.string()
  .min(1, "Image is required")
  .refine(
    (val) => {
      if (!val.startsWith('data:image/')) return false;
      const match = val.match(/^data:image\/(jpeg|png|jpg);base64,/i);
      return match !== null;
    },
    { message: "Invalid image format. Only base64 encoded JPEG or PNG are allowed." }
  );
