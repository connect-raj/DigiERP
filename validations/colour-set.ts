import { z } from 'zod';

export const createColourSetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  colourIds: z.array(z.string().min(1)).min(1, 'Select at least one colour'),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updateColourSetSchema = createColourSetSchema.partial();

export type CreateColourSetInput = z.infer<typeof createColourSetSchema>;
export type UpdateColourSetInput = z.infer<typeof updateColourSetSchema>;
