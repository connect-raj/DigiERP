import { z } from 'zod';
import { ProductKind } from '@prisma/client';

const baseProductLineSchema = z.object({
  kind: z.nativeEnum(ProductKind),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1).optional(),
  brandId: z.string().min(1).optional(),
  technologyId: z.string().min(1).optional(),
  formatId: z.string().min(1).optional(),
  roleId: z.string().min(1).optional(),
  colourSetId: z.string().min(1).optional(),
  taxClassId: z.string().min(1, 'Tax class is required'),
  // read by invoice.service.ts printed-name resolution
  invoiceName: z.string().optional(),
  aliases: z.array(z.string().min(1)).optional().default([]),
  isActive: z.boolean().optional().default(true),
  printheadIds: z.array(z.string().min(1)).optional().default([]),
});

/**
 * Kind-conditional field requirements shared by the create-time Zod check and
 * the update-time service-layer re-check (run against the patch merged onto
 * the existing record, since Zod alone can't see the existing row).
 */
export function kindConditionalErrors(data: {
  kind: ProductKind;
  technologyId?: string | null;
  roleId?: string | null;
  formatId?: string | null;
  printheadIds?: string[];
}): string[] {
  const errors: string[] = [];
  if (data.kind === 'INK') {
    if (!data.technologyId) errors.push('Technology is required for INK lines');
    if (!data.roleId) errors.push('Role is required for INK lines');
    if (!data.printheadIds || data.printheadIds.length < 1) {
      errors.push('At least one printhead is required for INK lines');
    }
  } else if (data.kind === 'MACHINE') {
    if (!data.technologyId) errors.push('Technology is required for MACHINE lines');
    if (!data.formatId) errors.push('Format is required for MACHINE lines');
  }
  return errors;
}

export const createProductLineSchema = baseProductLineSchema.superRefine((data, ctx) => {
  for (const message of kindConditionalErrors(data)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }
});

export const updateProductLineSchema = baseProductLineSchema.partial();

export type CreateProductLineInput = z.infer<typeof createProductLineSchema>;
export type UpdateProductLineInput = z.infer<typeof updateProductLineSchema>;
