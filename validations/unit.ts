import { z } from 'zod';

export const createUnitSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  appliesTo: z
    .array(z.enum(['INK', 'MACHINE', 'SPARE_PART']))
    .min(1, 'Select at least one product kind'),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updateUnitSchema = createUnitSchema.partial();

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
