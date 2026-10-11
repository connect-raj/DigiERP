import { z } from 'zod';

export const createGalleryApplicationTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export const updateGalleryApplicationTypeSchema = createGalleryApplicationTypeSchema.partial();

export type CreateGalleryApplicationTypeInput = z.infer<typeof createGalleryApplicationTypeSchema>;
export type UpdateGalleryApplicationTypeInput = z.infer<typeof updateGalleryApplicationTypeSchema>;
