import { z } from 'zod';

export const createGalleryItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  applicationTypeId: z.string().uuid('Invalid application type ID'),
  imageId: z.string().uuid('Invalid media ID'),
  relatedProductLineId: z.string().uuid('Invalid product line ID').nullable().optional(),
  displayOrder: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

export const updateGalleryItemSchema = z.object({
  title: z.string().min(1).optional(),
  applicationTypeId: z.string().uuid('Invalid application type ID').optional(),
  imageId: z.string().uuid('Invalid media ID').optional(),
  // Nullable (unlike create) so a client can explicitly clear the related
  // product line — omitting the key entirely means "leave unchanged".
  relatedProductLineId: z.string().uuid('Invalid product line ID').nullable().optional(),
  displayOrder: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

export type CreateGalleryItemInput = z.infer<typeof createGalleryItemSchema>;
export type UpdateGalleryItemInput = z.infer<typeof updateGalleryItemSchema>;
