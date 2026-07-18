import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { paymentRepository, AllocateBatchData, CreatePaymentData } from './payment.repository';
import prisma from '@/lib/prisma';
import { BadRequestError, ConflictError } from '@/lib/errors';

vi.mock('@/lib/prisma', () => ({
  default: {
    payment: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    allocationBatch: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    paymentAllocation: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const invoiceRow = {
  id: 'inv-1',
  invoiceNo: 'INV-2627-001',
  customerId: 'cust-1',
  totalAmount: new Prisma.Decimal(1000),
  paidAmount: new Prisma.Decimal(0),
  paymentStatus: 'UNPAID',
};

const paymentRow = {
  id: 'pay-1',
  customerId: 'cust-1',
  amount: new Prisma.Decimal(1000),
  unallocatedAmount: new Prisma.Decimal(1000),
};

describe('PaymentRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(
      (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma)
    );
    vi.mocked(prisma.allocationBatch.delete).mockResolvedValue({} as never);
  });

  describe('findAll', () => {
    it('filters by reference when search is provided, and returns total count', async () => {
      vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
      vi.mocked(prisma.payment.count).mockResolvedValue(4);
      const result = await paymentRepository.findAll({ search: 'REF-1', skip: 10, take: 10 });
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reference: { contains: 'REF-1', mode: 'insensitive' } },
          orderBy: { date: 'desc' },
          skip: 10,
          take: 10,
        })
      );
      expect(result).toEqual({ data: [], total: 4 });
    });
  });

  describe('findStatsRows', () => {
    it('selects only the fields needed for stat aggregation, unbounded', async () => {
      vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
      await paymentRepository.findStatsRows({ customerId: 'cust-1' });
      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1' },
        select: { amount: true, unallocatedAmount: true },
      });
    });
  });

  describe('createPaymentTx', () => {
    it('creates the payment with unallocatedAmount = amount and increments Customer.creditBalance', async () => {
      const data: CreatePaymentData = {
        customerId: 'cust-1',
        amount: 500,
        mode: 'BANK_TRANSFER',
        date: new Date('2026-07-01'),
        reference: 'REF-1',
        recordedById: 'user-1',
      };
      vi.mocked(prisma.payment.create).mockResolvedValue({ id: 'pay-1', ...data } as never);

      await paymentRepository.createPaymentTx(data);

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'cust-1',
            amount: 500,
            unallocatedAmount: 500,
            recordedById: 'user-1',
          }),
        })
      );
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { creditBalance: { increment: 500 } },
      });
    });
  });

  describe('allocateBatch', () => {
    const baseData: AllocateBatchData = {
      idempotencyKey: 'idem-1',
      allocations: [{ paymentId: 'pay-1', invoiceId: 'inv-1', amount: 1000 }],
    };

    it('replays an existing batch instead of reprocessing when idempotencyKey already exists (P2002)', async () => {
      vi.mocked(prisma.allocationBatch.create).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.19.3',
        })
      );
      vi.mocked(prisma.allocationBatch.findUnique).mockResolvedValue({
        id: 'batch-1',
        idempotencyKey: 'idem-1',
        allocations: [
          {
            id: 'alloc-1',
            paymentId: 'pay-1',
            invoiceId: 'inv-1',
            amount: new Prisma.Decimal(1000),
            createdAt: new Date('2026-07-01'),
            invoice: { ...invoiceRow, paymentStatus: 'PAID' },
            payment: { ...paymentRow, unallocatedAmount: new Prisma.Decimal(0) },
          },
        ],
      } as never);

      const result = await paymentRepository.allocateBatch(baseData);

      expect(result.replay).toBe(true);
      expect(result.created).toHaveLength(1);
      expect(result.updatedInvoices[0]).toMatchObject({ id: 'inv-1', paymentStatus: 'PAID' });
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('fast-fails with INVOICE_CUSTOMER_MISMATCH and rolls back the batch', async () => {
      vi.mocked(prisma.allocationBatch.create).mockResolvedValue({
        id: 'batch-1',
        idempotencyKey: 'idem-1',
      } as never);
      vi.mocked(prisma.payment.findMany).mockResolvedValue([paymentRow] as never);
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { ...invoiceRow, customerId: 'cust-2' },
      ] as never);

      await expect(paymentRepository.allocateBatch(baseData)).rejects.toMatchObject({
        code: 'INVOICE_CUSTOMER_MISMATCH',
      });
      await expect(paymentRepository.allocateBatch(baseData)).rejects.toBeInstanceOf(
        BadRequestError
      );
      expect(prisma.allocationBatch.delete).toHaveBeenCalledWith({ where: { id: 'batch-1' } });
    });

    it('fast-fails with INVOICE_ALREADY_PAID and rolls back the batch', async () => {
      vi.mocked(prisma.allocationBatch.create).mockResolvedValue({
        id: 'batch-1',
        idempotencyKey: 'idem-1',
      } as never);
      vi.mocked(prisma.payment.findMany).mockResolvedValue([paymentRow] as never);
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { ...invoiceRow, paidAmount: new Prisma.Decimal(1000) },
      ] as never);

      await expect(paymentRepository.allocateBatch(baseData)).rejects.toMatchObject({
        code: 'INVOICE_ALREADY_PAID',
      });
      expect(prisma.allocationBatch.delete).toHaveBeenCalledWith({ where: { id: 'batch-1' } });
    });

    it('returns ALLOCATION_CONFLICT and rolls back the batch when the payment balance changed concurrently', async () => {
      vi.mocked(prisma.allocationBatch.create).mockResolvedValue({
        id: 'batch-1',
        idempotencyKey: 'idem-1',
      } as never);
      vi.mocked(prisma.payment.findMany).mockResolvedValue([paymentRow] as never);
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([invoiceRow] as never);
      vi.mocked(prisma.payment.update).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.19.3',
        })
      );
      vi.mocked(prisma.invoice.update).mockResolvedValue({
        ...invoiceRow,
        paidAmount: new Prisma.Decimal(1000),
      } as never);

      await expect(paymentRepository.allocateBatch(baseData)).rejects.toMatchObject({
        code: 'ALLOCATION_CONFLICT',
      });
      await expect(paymentRepository.allocateBatch(baseData)).rejects.toBeInstanceOf(ConflictError);
      expect(prisma.allocationBatch.delete).toHaveBeenCalledWith({ where: { id: 'batch-1' } });
    });

    it('applies the full allocation on the happy path and marks the invoice PAID', async () => {
      vi.mocked(prisma.allocationBatch.create).mockResolvedValue({
        id: 'batch-1',
        idempotencyKey: 'idem-1',
      } as never);
      vi.mocked(prisma.payment.findMany).mockResolvedValue([paymentRow] as never);
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([invoiceRow] as never);
      vi.mocked(prisma.payment.update).mockResolvedValue({
        ...paymentRow,
        unallocatedAmount: new Prisma.Decimal(0),
      } as never);
      vi.mocked(prisma.invoice.update).mockImplementation(((args: {
        data: { paidAmount?: unknown; paymentStatus?: string };
      }) => {
        const { data } = args;
        if (data.paidAmount) {
          return Promise.resolve({ ...invoiceRow, paidAmount: new Prisma.Decimal(1000) });
        }
        return Promise.resolve({ ...invoiceRow, paidAmount: new Prisma.Decimal(1000), ...data });
      }) as never);
      vi.mocked(prisma.paymentAllocation.create).mockResolvedValue({
        id: 'alloc-1',
        paymentId: 'pay-1',
        invoiceId: 'inv-1',
        batchId: 'batch-1',
        amount: new Prisma.Decimal(1000),
        createdAt: new Date('2026-07-01'),
      } as never);

      const result = await paymentRepository.allocateBatch(baseData);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1', unallocatedAmount: { gte: 1000 } },
        data: { unallocatedAmount: { decrement: 1000 } },
      });
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1', paidAmount: { lte: 0 } },
        data: { paidAmount: { increment: 1000 } },
      });
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { paymentStatus: 'PAID' },
      });
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: {
          outstandingBalance: { decrement: 1000 },
          creditBalance: { decrement: 1000 },
        },
      });
      expect(result.replay).toBe(false);
      expect(result.created).toHaveLength(1);
      expect(result.updatedInvoices[0]).toMatchObject({ id: 'inv-1', paymentStatus: 'PAID' });
      expect(result.updatedPayments[0]).toMatchObject({ id: 'pay-1' });
      expect(prisma.allocationBatch.delete).not.toHaveBeenCalled();
    });
  });
});
