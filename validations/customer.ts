import { z } from 'zod';

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const createCustomerSchema = z.object({
  firmName: z.string().min(1, 'Firm name is required'),
  state: z.string().min(1, 'State is required'),
  contactPerson: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  gstin: z.string().regex(gstinRegex, 'Invalid GSTIN').optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  creditLimit: z.number().nonnegative('Credit limit must be >= 0').optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const setCustomerPriceSchema = z.object({
  price: z.number().nonnegative('Price must be >= 0'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type SetCustomerPriceInput = z.infer<typeof setCustomerPriceSchema>;
