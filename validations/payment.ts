import { z } from 'zod';

export const createPaymentSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  amount: z.number().positive('Amount must be > 0'),
  mode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER']).default('BANK_TRANSFER'),
  date: z.string().datetime('Invalid date'),
  reference: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const allocatePaymentsSchema = z.object({
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
  allocations: z
    .array(
      z.object({
        paymentId: z.string().uuid('Invalid payment ID'),
        invoiceId: z.string().uuid('Invalid invoice ID'),
        amount: z.number().positive('Amount must be > 0'),
      })
    )
    .min(1, 'At least one allocation is required'),
});

export type AllocatePaymentsInput = z.infer<typeof allocatePaymentsSchema>;
