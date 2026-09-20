import { z } from 'zod';

// Kind-conditional rules (packSize/colourId required-for-INK, name
// required-for-MACHINE/SPARE_PART, unit must belong to the line's kind,
// colour must belong to the line's colour set) can't be checked here — they
// need the parent ProductLine's `kind`/`role`/`colourSet`, which only the
// service layer has loaded. This schema only enforces shape/type.
export const createProductSchema = z.object({
  lineId: z.string().min(1, 'Product line is required'),
  // Required by the service for MACHINE/SPARE_PART; ignored (server-generated)
  // for INK.
  name: z.string().min(1).optional(),
  unitId: z.string().min(1, 'Unit is required'),
  packSize: z.number().positive('Pack size must be greater than 0').optional(),
  colourId: z.string().min(1).optional(),
  specs: z.record(z.string(), z.unknown()).optional(),
  // Optional per-product override of the line's tax class.
  taxClassId: z.string().min(1).optional(),
  basePrice: z.number().min(0, 'Base price must be non-negative').optional().default(0),
  lowerStockLimit: z.number().min(0).optional().default(0),
});

export const updateProductSchema = z.object({
  lineId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  unitId: z.string().min(1).optional(),
  packSize: z.number().positive('Pack size must be greater than 0').nullable().optional(),
  colourId: z.string().min(1).nullable().optional(),
  specs: z.record(z.string(), z.unknown()).nullable().optional(),
  taxClassId: z.string().min(1).nullable().optional(),
  basePrice: z.number().min(0).optional(),
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
