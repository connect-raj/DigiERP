import { z } from 'zod';

export const createTaxClassSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  hsnCode: z.string().optional(),
  gstRate: z.number().min(0).max(100),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updateTaxClassSchema = createTaxClassSchema.partial();

export type CreateTaxClassInput = z.infer<typeof createTaxClassSchema>;
export type UpdateTaxClassInput = z.infer<typeof updateTaxClassSchema>;
