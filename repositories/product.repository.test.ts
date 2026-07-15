import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productRepository } from './product.repository';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('@/lib/prisma', () => ({
  default: {
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    stockTransaction: {
      create: vi.fn(),
    },
    dispatchEntryItem: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockProduct = {
  id: 'prod-id-1',
  name: 'Cyan 1Ltr',
  categoryId: 'cat-id-1',
  basePrice: new Decimal('0.00'),
  unit: 'LTR',
  currentStock: new Decimal('10.000'),
  lowerStockLimit: new Decimal('2.000'),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: 'cat-id-1', name: 'Konica 512i Solvent Ink' },
  vendorProducts: [],
  stockTxns: [],
};

describe('ProductRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findAll', () => {
    beforeEach(() => {
      vi.mocked(prisma.product.count).mockResolvedValue(0);
    });

    it('should return products with category and vendors, plus total count', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([mockProduct as never]);
      vi.mocked(prisma.product.count).mockResolvedValue(1);
      const result = await productRepository.findAll({});
      expect(prisma.product.findMany).toHaveBeenCalled();
      expect(result).toEqual({ data: [mockProduct], total: 1 });
    });

    it('should filter by categoryId', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      await productRepository.findAll({ categoryId: 'cat-id-1' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'cat-id-1' }),
        })
      );
    });

    it('should filter by isActive', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      await productRepository.findAll({ isActive: false });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: false }),
        })
      );
    });

    it('should search by name or category name', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      await productRepository.findAll({ search: 'cyan' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'cyan', mode: 'insensitive' } },
              { category: { name: { contains: 'cyan', mode: 'insensitive' } } },
            ],
          }),
        })
      );
    });

    it('should apply skip/take for pagination', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      await productRepository.findAll({ skip: 10, take: 10 });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });
  });

  describe('findById', () => {
    it('should return a product with last 10 stock transactions', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      const result = await productRepository.findById('prod-id-1');
      expect(prisma.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-id-1' },
          include: expect.objectContaining({
            stockTxns: expect.objectContaining({ take: 10 }),
          }),
        })
      );
      expect(result).toEqual(mockProduct);
    });

    it('should return null when not found', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
      const result = await productRepository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a product', async () => {
      vi.mocked(prisma.product.create).mockResolvedValue(mockProduct as never);
      const input = { categoryId: 'cat-id-1', name: 'Cyan 1Ltr', basePrice: 0 };
      const result = await productRepository.create(input);
      expect(prisma.product.create).toHaveBeenCalledWith({ data: input });
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updated = { ...mockProduct, name: 'Updated Name' };
      vi.mocked(prisma.product.update).mockResolvedValue(updated as never);
      const result = await productRepository.update('prod-id-1', { name: 'Updated Name' });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-id-1' },
        data: { name: 'Updated Name' },
      });
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('softDelete', () => {
    it('should set isActive to false', async () => {
      vi.mocked(prisma.product.update).mockResolvedValue({
        ...mockProduct,
        isActive: false,
      } as never);
      await productRepository.softDelete('prod-id-1');
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-id-1' },
        data: { isActive: false },
      });
    });
  });

  describe('hasOpenChallans', () => {
    it('should return true when an unbilled, non-cancelled dispatch references the product', async () => {
      vi.mocked(prisma.dispatchEntryItem.count).mockResolvedValue(1);
      const result = await productRepository.hasOpenChallans('prod-id-1');
      expect(prisma.dispatchEntryItem.count).toHaveBeenCalledWith({
        where: {
          productId: 'prod-id-1',
          dispatchEntry: { status: 'PENDING_BILLING', isCancelled: false },
        },
      });
      expect(result).toBe(true);
    });

    it('should return false when there are no open challans', async () => {
      vi.mocked(prisma.dispatchEntryItem.count).mockResolvedValue(0);
      const result = await productRepository.hasOpenChallans('prod-id-1');
      expect(result).toBe(false);
    });
  });

  describe('getStock', () => {
    it('should return stock info with isLow flag', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        currentStock: new Decimal('10.000'),
        lowerStockLimit: new Decimal('2.000'),
        stockTxns: [],
      } as never);
      const result = await productRepository.getStock('prod-id-1');
      expect(result).toEqual({
        current: 10,
        lowerLimit: 2,
        isLow: false,
        transactions: [],
      });
    });

    it('should flag isLow when stock <= lowerLimit', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        currentStock: new Decimal('1.000'),
        lowerStockLimit: new Decimal('2.000'),
        stockTxns: [],
      } as never);
      const result = await productRepository.getStock('prod-id-1');
      expect(result?.isLow).toBe(true);
    });

    it('should return null when product not found', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
      const result = await productRepository.getStock('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('adjustStock', () => {
    it('should call $transaction', async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue(mockProduct as never);
      await productRepository.adjustStock('prod-id-1', 5, 'ADJUSTMENT');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
