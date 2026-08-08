import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { invoiceRepository, CreateInvoiceData } from './invoice.repository';
import prisma from '@/lib/prisma';
import { BadRequestError } from '@/lib/errors';

vi.mock('@/lib/prisma', () => ({
  default: {
    invoice: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    dispatchEntry: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      update: vi.fn(),
    },
    customerPrice: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    priceHistory: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    settings: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/invoice-no', () => ({
  generateInvoiceNo: vi.fn().mockResolvedValue('INV-2627-001'),
}));

const baseCreateData: CreateInvoiceData = {
  dispatchEntryId: 'de-1',
  customerId: 'cust-1',
  date: new Date('2026-07-07'),
  place: 'Ahmedabad',
  transport: 'ABC Transport',
  totalAmount: 1180,
  totalCgst: 90,
  totalSgst: 90,
  totalIgst: 0,
  items: [
    {
      productId: 'prod-1',
      productName: 'Ink Red',
      categoryName: 'Ink',
      hsnCode: '3215',
      unit: 'LTR',
      quantity: 10,
      price: 100,
      cgst: 90,
      sgst: 90,
      igst: 0,
      lineTotal: 1180,
    },
  ],
  company: {
    name: 'DigiERP Ink Distributors',
    address: 'Ahmedabad, Gujarat',
    state: 'Gujarat',
    gstin: '24AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
  },
  customerSnapshot: {
    firmName: 'Test Firm',
    address: 'Some Street',
    city: 'Ahmedabad',
    state: 'Gujarat',
    gstin: null,
  },
  dispatchReference: {
    challanNo: 'CH-001',
    dispatchDate: new Date('2026-07-01'),
  },
};

describe('InvoiceRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(
      (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma)
    );
    vi.mocked(prisma.invoice.create).mockResolvedValue({ id: 'inv-1', items: [] } as never);
    vi.mocked(prisma.customerPrice.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.customerPrice.findMany).mockResolvedValue([]);
    vi.mocked(prisma.priceHistory.createMany).mockResolvedValue({ count: 1 } as never);
  });

  describe('findAll', () => {
    it('filters by invoiceNo (STANDARD only) when search is provided', async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
      await invoiceRepository.findAll({ search: 'INV-2627' });
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            type: 'STANDARD',
            status: 'ACTIVE',
            invoiceNo: { contains: 'INV-2627', mode: 'insensitive' },
          },
          orderBy: { date: 'desc' },
        })
      );
    });

    it('derives balances then paginates in code (total is the full matched set)', async () => {
      const rows = Array.from({ length: 7 }, (_, i) => ({
        id: `inv-${i}`,
        totalAmount: 100,
        paymentAllocations: [],
      }));
      vi.mocked(prisma.invoice.findMany).mockResolvedValue(rows as never);

      const result = await invoiceRepository.findAll({ skip: 5, take: 10 });

      expect(result.total).toBe(7);
      expect(result.data).toHaveLength(2); // slice(5, 15)
      expect(result.data[0]).toMatchObject({ balanceDue: 100, paymentStatus: 'UNPAID' });
    });

    it('filters by derived paymentStatus in code', async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { id: 'a', totalAmount: 100, paymentAllocations: [] }, // UNPAID
        { id: 'b', totalAmount: 100, paymentAllocations: [{ amount: 100 }] }, // PAID
      ] as never);

      const result = await invoiceRepository.findAll({ paymentStatus: 'PAID' });
      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({ id: 'b', paymentStatus: 'PAID' });
    });
  });

  describe('findStatsRows', () => {
    it('selects derived-balance inputs (STANDARD only), unbounded', async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
      await invoiceRepository.findStatsRows({ search: 'INV-2627' });
      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: {
          type: 'STANDARD',
          status: 'ACTIVE',
          invoiceNo: { contains: 'INV-2627', mode: 'insensitive' },
        },
        select: {
          totalAmount: true,
          status: true,
          paymentAllocations: {
            where: { payment: { status: 'ACTIVE' } },
            select: { amount: true },
          },
        },
      });
    });
  });

  describe('createInvoiceTx', () => {
    it('uses a transaction with 15s timeout', async () => {
      await invoiceRepository.createInvoiceTx(baseCreateData);
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        maxWait: 10000,
        timeout: 15000,
      });
    });

    it('auto-upserts CustomerPrice and logs PriceHistory when no manual price exists', async () => {
      vi.mocked(prisma.customerPrice.findMany).mockResolvedValue([]);

      await invoiceRepository.createInvoiceTx(baseCreateData);

      expect(prisma.customerPrice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId_productId: { customerId: 'cust-1', productId: 'prod-1' } },
          create: expect.objectContaining({ price: 100, isManual: false }),
          update: expect.objectContaining({ price: 100, isManual: false }),
        })
      );
      expect(prisma.priceHistory.createMany).toHaveBeenCalledWith({
        data: [
          {
            customerId: 'cust-1',
            productId: 'prod-1',
            price: 100,
            source: 'AUTO_INVOICE',
          },
        ],
      });
    });

    it('skips the CustomerPrice upsert but still logs PriceHistory when the price is manually set', async () => {
      vi.mocked(prisma.customerPrice.findMany).mockResolvedValue([
        {
          id: 'cp-1',
          customerId: 'cust-1',
          productId: 'prod-1',
          price: 150,
          isManual: true,
          updatedAt: new Date(),
        } as never,
      ]);

      await invoiceRepository.createInvoiceTx(baseCreateData);

      expect(prisma.customerPrice.upsert).not.toHaveBeenCalled();
      expect(prisma.priceHistory.createMany).toHaveBeenCalledWith({
        data: [
          {
            customerId: 'cust-1',
            productId: 'prod-1',
            price: 100,
            source: 'AUTO_INVOICE',
          },
        ],
      });
    });

    it('locks the dispatch entry as BILLED without touching any stored balance', async () => {
      await invoiceRepository.createInvoiceTx(baseCreateData);

      // balances are derived now — no customer balance column to increment
      expect(prisma.customer.update).not.toHaveBeenCalled();
      expect(prisma.dispatchEntry.update).toHaveBeenCalledWith({
        where: { id: 'de-1' },
        data: { status: 'BILLED' },
      });
    });

    it('remaps a P2002 unique constraint violation to DISPATCH_ENTRY_ALREADY_BILLED', async () => {
      vi.mocked(prisma.invoice.create).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.19.3',
        })
      );

      await expect(invoiceRepository.createInvoiceTx(baseCreateData)).rejects.toMatchObject({
        code: 'DISPATCH_ENTRY_ALREADY_BILLED',
      });
      await expect(invoiceRepository.createInvoiceTx(baseCreateData)).rejects.toBeInstanceOf(
        BadRequestError
      );
    });
  });
});
