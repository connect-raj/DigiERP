import { z } from 'zod';

export const createColourSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updateColourSchema = createColourSchema.partial();

export type CreateColourInput = z.infer<typeof createColourSchema>;
export type UpdateColourInput = z.infer<typeof updateColourSchema>;
