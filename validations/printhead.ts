import { z } from 'zod';

export const createPrintheadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  dropSizePl: z.number().optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updatePrintheadSchema = createPrintheadSchema.partial();

export type CreatePrintheadInput = z.infer<typeof createPrintheadSchema>;
export type UpdatePrintheadInput = z.infer<typeof updatePrintheadSchema>;
