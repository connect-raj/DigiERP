import { z } from 'zod';

export const createLineRoleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  usesColours: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updateLineRoleSchema = createLineRoleSchema.partial();

export type CreateLineRoleInput = z.infer<typeof createLineRoleSchema>;
export type UpdateLineRoleInput = z.infer<typeof updateLineRoleSchema>;
