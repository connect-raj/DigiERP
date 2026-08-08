import { z } from 'zod';

const allocationLineSchema = z.object({
  // null invoiceId == on-account / open-balance credit
  invoiceId: z.string().uuid('Invalid invoice ID').nullable().default(null),
  amount: z.number().positive('Amount must be > 0'),
  note: z.string().optional(),
});

export type AllocationLineInput = z.infer<typeof allocationLineSchema>;

export const createPaymentSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  amount: z.number().positive('Amount must be > 0'),
  mode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER']).default('BANK_TRANSFER'),
  date: z.string().datetime('Invalid date'),
  reference: z.string().optional(),
  allocations: z.array(allocationLineSchema).default([]),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updateAllocationsSchema = z.object({
  allocations: z.array(allocationLineSchema),
});

export type UpdateAllocationsInput = z.infer<typeof updateAllocationsSchema>;
