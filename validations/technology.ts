import { z } from 'zod';

export const createTechnologySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updateTechnologySchema = createTechnologySchema.partial();

export type CreateTechnologyInput = z.infer<typeof createTechnologySchema>;
export type UpdateTechnologyInput = z.infer<typeof updateTechnologySchema>;
