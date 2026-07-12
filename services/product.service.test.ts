import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productService } from './product.service';
import { productRepository } from '@/repositories/product.repository';
import { NotFoundError } from '@/lib/errors';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('@/repositories/product.repository', () => ({
  productRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    hasOpenChallans: vi.fn(),
    getStock: vi.fn(),
    adjustStock: vi.fn(),
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

const mockProductNoStock = { ...mockProduct, currentStock: new Decimal('0.000') };

describe('ProductService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAll', () => {
    it('should return all products with total count', async () => {
      vi.spyOn(productRepository, 'findAll').mockResolvedValue({
        data: [mockProduct as never],
        total: 1,
      });
      const result = await productService.getAll({});
      expect(productRepository.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual({ data: [mockProduct], total: 1 });
    });
  });

  describe('getById', () => {
    it('should return a product when found', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      const result = await productService.getById('prod-id-1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundError when product does not exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(null);
      await expect(productService.getById('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create and return a product', async () => {
      vi.spyOn(productRepository, 'create').mockResolvedValue(mockProduct as never);
      const input = {
        categoryId: 'cat-id-1',
        name: 'Cyan 1Ltr',
        basePrice: 0,
      };
      const result = await productService.create(input);
      expect(productRepository.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should update a product when found', async () => {
      const updated = { ...mockProduct, name: 'Updated Name' };
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      vi.spyOn(productRepository, 'update').mockResolvedValue(updated as never);
      const result = await productService.update('prod-id-1', { name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundError if product does not exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(null);
      await expect(productService.update('bad-id', { name: 'X' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should soft-delete a product with no stock and no challans', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProductNoStock as never);
      vi.spyOn(productRepository, 'hasOpenChallans').mockResolvedValue(false);
      vi.spyOn(productRepository, 'softDelete').mockResolvedValue(mockProductNoStock as never);
      await productService.delete('prod-id-1');
      expect(productRepository.softDelete).toHaveBeenCalledWith('prod-id-1');
    });

    it('should throw NotFoundError if product does not exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(null);
      await expect(productService.delete('bad-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError with PRODUCT_HAS_STOCK if stock > 0', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      await expect(productService.delete('prod-id-1')).rejects.toThrow(
        expect.objectContaining({ code: 'PRODUCT_HAS_STOCK' })
      );
    });

    it('should throw BadRequestError with PRODUCT_HAS_OPEN_CHALLANS if challans exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProductNoStock as never);
      vi.spyOn(productRepository, 'hasOpenChallans').mockResolvedValue(true);
      await expect(productService.delete('prod-id-1')).rejects.toThrow(
        expect.objectContaining({ code: 'PRODUCT_HAS_OPEN_CHALLANS' })
      );
    });
  });

  describe('getStock', () => {
    it('should return stock info for an existing product', async () => {
      const stockData = {
        current: 10,
        lowerLimit: 2,
        isLow: false,
        transactions: [],
      };
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      vi.spyOn(productRepository, 'getStock').mockResolvedValue(stockData);
      const result = await productService.getStock('prod-id-1');
      expect(result).toEqual(stockData);
    });

    it('should throw NotFoundError if product does not exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(null);
      await expect(productService.getStock('bad-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock for valid quantity', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      vi.spyOn(productRepository, 'adjustStock').mockResolvedValue(mockProduct as never);
      await productService.adjustStock('prod-id-1', { quantity: 5, reason: 'ADJUSTMENT' });
      expect(productRepository.adjustStock).toHaveBeenCalledWith('prod-id-1', 5, 'ADJUSTMENT');
    });

    it('should throw BadRequestError with INSUFFICIENT_STOCK when stock goes below 0', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      await expect(
        productService.adjustStock('prod-id-1', { quantity: -100, reason: 'ADJUSTMENT' })
      ).rejects.toThrow(expect.objectContaining({ code: 'INSUFFICIENT_STOCK' }));
    });

    it('should throw NotFoundError if product does not exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(null);
      await expect(
        productService.adjustStock('bad-id', { quantity: 5, reason: 'ADJUSTMENT' })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
