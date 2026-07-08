import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchEntryRepository } from './dispatch-entry.repository';
import prisma from '@/lib/prisma';
import { BadRequestError } from '@/lib/errors';

vi.mock('@/lib/prisma', () => ({
  default: {
    dispatchEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    customerPrice: {
      findMany: vi.fn(),
    },
    stockTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('DispatchEntryRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(
      (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma)
    );
  });

  describe('findAll', () => {
    it('defaults to isCancelled false and orders by date desc', async () => {
      vi.mocked(prisma.dispatchEntry.findMany).mockResolvedValue([]);
      await dispatchEntryRepository.findAll({});
      expect(prisma.dispatchEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isCancelled: false },
          orderBy: { date: 'desc' },
        })
      );
    });

    it('applies customerId, status, date range, and search filters', async () => {
      vi.mocked(prisma.dispatchEntry.findMany).mockResolvedValue([]);
      const from = new Date('2026-01-01');
      const to = new Date('2026-01-31');
      await dispatchEntryRepository.findAll({
        customerId: 'cust-1',
        status: 'BILLED',
        isCancelled: true,
        from,
        to,
        search: 'CH-001',
      });
      expect(prisma.dispatchEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isCancelled: true,
            customerId: 'cust-1',
            status: 'BILLED',
            date: { gte: from, lte: to },
            challanNo: { contains: 'CH-001', mode: 'insensitive' },
          },
        })
      );
    });
  });

  describe('findById', () => {
    it('returns null when not found', async () => {
      vi.mocked(prisma.dispatchEntry.findUnique).mockResolvedValue(null);
      const result = await dispatchEntryRepository.findById('missing-id');
      expect(result).toBeNull();
    });
  });

  describe('createWithStockDecrement', () => {
    const baseItem = {
      productId: 'prod-1',
      quantity: 5,
      price: 100,
      lineTotal: 500,
    };

    it('creates the entry and decrements stock when supply is sufficient', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        { id: 'prod-1', name: 'Ink Red', currentStock: 10 } as never,
      ]);
      vi.mocked(prisma.dispatchEntry.create).mockResolvedValue({
        id: 'entry-1',
        items: [],
      } as never);

      const result = await dispatchEntryRepository.createWithStockDecrement({
        challanNo: 'CH-001',
        customerId: 'cust-1',
        place: 'Ahmedabad',
        date: new Date('2026-07-01'),
        totalAmount: 500,
        items: [baseItem],
      });

      expect(result).toEqual(expect.objectContaining({ id: 'entry-1' }));
      expect(prisma.stockTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'prod-1',
          changeQty: -5,
          stockBefore: 10,
          stockAfter: 5,
          reason: 'DISPATCH_ENTRY',
          dispatchEntryId: 'entry-1',
        }),
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { currentStock: 5 },
      });
    });

    it('passes transportAmount through to the DispatchEntry create call when provided', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        { id: 'prod-1', name: 'Ink Red', currentStock: 10 } as never,
      ]);
      vi.mocked(prisma.dispatchEntry.create).mockResolvedValue({
        id: 'entry-1',
        items: [],
      } as never);

      await dispatchEntryRepository.createWithStockDecrement({
        challanNo: 'CH-001',
        customerId: 'cust-1',
        place: 'Ahmedabad',
        transportAmount: 250,
        date: new Date('2026-07-01'),
        totalAmount: 500,
        items: [baseItem],
      });

      expect(prisma.dispatchEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ transportAmount: 250 }),
        })
      );
    });

    it('aborts with INSUFFICIENT_STOCK and never writes when stock is short', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        { id: 'prod-1', name: 'Ink Red', currentStock: 2 } as never,
      ]);

      await expect(
        dispatchEntryRepository.createWithStockDecrement({
          challanNo: 'CH-002',
          customerId: 'cust-1',
          place: 'Ahmedabad',
          date: new Date('2026-07-01'),
          totalAmount: 500,
          items: [baseItem],
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'INSUFFICIENT_STOCK',
          details: [{ productId: 'prod-1', productName: 'Ink Red', available: 2, requested: 5 }],
        })
      );
      expect(prisma.dispatchEntry.create).not.toHaveBeenCalled();
      expect(prisma.stockTransaction.create).not.toHaveBeenCalled();
    });

    it('checks cumulative quantity when the same product appears in multiple lines', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        { id: 'prod-1', name: 'Ink Red', currentStock: 8 } as never,
      ]);

      await expect(
        dispatchEntryRepository.createWithStockDecrement({
          challanNo: 'CH-003',
          customerId: 'cust-1',
          place: 'Ahmedabad',
          date: new Date('2026-07-01'),
          totalAmount: 1000,
          items: [baseItem, { ...baseItem, quantity: 5 }],
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('cancelWithStockRestore', () => {
    it('marks the entry cancelled and restores stock for each item', async () => {
      vi.mocked(prisma.dispatchEntry.update).mockResolvedValue({} as never);
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-1',
        name: 'Ink Red',
        currentStock: 5,
      } as never);

      const result = await dispatchEntryRepository.cancelWithStockRestore('entry-1', [
        { productId: 'prod-1', quantity: 5 },
      ]);

      expect(prisma.dispatchEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { isCancelled: true },
      });
      expect(prisma.stockTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'prod-1',
          changeQty: 5,
          stockBefore: 5,
          stockAfter: 10,
          reason: 'DISPATCH_ENTRY_CANCELLED',
          dispatchEntryId: 'entry-1',
        }),
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { currentStock: 10 },
      });
      expect(result).toEqual([{ productId: 'prod-1', productName: 'Ink Red', qty: 5 }]);
    });
  });
});
