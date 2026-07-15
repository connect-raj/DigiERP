import { z } from 'zod';

export const updateSettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyAddress: z.string().min(1, 'Company address is required'),
  companyState: z.string().min(1, 'Company state is required'),
  companyGstin: z.string().min(1, 'Company GSTIN is required'),
  companyPan: z.string().min(1).nullable().optional(),
  financialYearStart: z.number().int().min(1).max(12),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
