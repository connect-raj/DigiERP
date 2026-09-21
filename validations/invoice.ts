import { z } from 'zod';

const invoiceItemOverrideSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  printedNameOverride: z.string().trim().min(1).optional(),
  rememberForCustomer: z.boolean().optional(),
});

export const createInvoiceSchema = z.object({
  dispatchEntryId: z.string().uuid('Invalid dispatch entry ID'),
  date: z.string().datetime('Invalid date').optional(),
  items: z.array(invoiceItemOverrideSchema).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const setOpeningBalanceSchema = z.object({
  totalAmount: z.number().nonnegative('Opening balance must be >= 0'),
  asOfDate: z.string().datetime('Invalid date'),
});

export type SetOpeningBalanceInput = z.infer<typeof setOpeningBalanceSchema>;
