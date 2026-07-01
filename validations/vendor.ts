import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().min(1, 'Address is required'),
  state: z.string().min(1, 'State is required'),
  email: z.string().email('Invalid email').optional(),
  gstin: z.string().optional(),
  paymentTerms: z.string().optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

export const linkVendorProductsSchema = z.object({
  products: z
    .array(
      z.object({
        productId: z.string().uuid('Invalid product ID'),
        isPreferred: z.boolean().optional(),
      })
    )
    .min(1, 'At least one product is required'),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type LinkVendorProductsInput = z.infer<typeof linkVendorProductsSchema>;
