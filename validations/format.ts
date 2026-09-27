import { z } from 'zod';

export const createFormatSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updateFormatSchema = createFormatSchema.partial();

export type CreateFormatInput = z.infer<typeof createFormatSchema>;
export type UpdateFormatInput = z.infer<typeof updateFormatSchema>;
