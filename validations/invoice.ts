import { z } from 'zod';

export const createInvoiceSchema = z.object({
  dispatchEntryId: z.string().uuid('Invalid dispatch entry ID'),
  date: z.string().datetime('Invalid date').optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
