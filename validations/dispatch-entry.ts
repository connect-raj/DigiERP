import { z } from 'zod';

export const createDispatchEntrySchema = z.object({
  challanNo: z.string().min(1, 'Challan number is required'),
  customerId: z.string().uuid('Invalid customer ID'),
  place: z.string().min(1, 'Place is required'),
  date: z.string().datetime('Invalid date'),
  transport: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Invalid product ID'),
        quantity: z.number().positive('Quantity must be > 0'),
        price: z.number().nonnegative('Price must be >= 0').optional(),
      })
    )
    .min(1, 'At least one item is required'),
});

export type CreateDispatchEntryInput = z.infer<typeof createDispatchEntrySchema>;
