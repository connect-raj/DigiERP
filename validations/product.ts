import { z } from 'zod';

export const createProductSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  name: z.string().min(1, 'Name is required'),
  basePrice: z.number().min(0, 'Base price must be non-negative'),
  unit: z.string().optional(),
  lowerStockLimit: z.number().min(0).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  basePrice: z.number().min(0).optional(),
  unit: z.string().optional(),
  lowerStockLimit: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const adjustStockSchema = z.object({
  quantity: z.number(),
  reason: z.literal('ADJUSTMENT'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
