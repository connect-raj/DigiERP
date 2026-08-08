import { z } from 'zod';

export const createInvoiceSchema = z.object({
  dispatchEntryId: z.string().uuid('Invalid dispatch entry ID'),
  date: z.string().datetime('Invalid date').optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const setOpeningBalanceSchema = z.object({
  totalAmount: z.number().nonnegative('Opening balance must be >= 0'),
  asOfDate: z.string().datetime('Invalid date'),
});

export type SetOpeningBalanceInput = z.infer<typeof setOpeningBalanceSchema>;
