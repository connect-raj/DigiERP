import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryRepository } from './category.repository';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('@/lib/prisma', () => ({
  default: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockCategory = {
  id: 'cat-id-1',
  name: 'Konica 512i Solvent Ink',
  hsnCode: '3215',
  gstRate: new Decimal('18.00'),
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { products: 8 },
};

describe('CategoryRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should return categories with product count', async () => {
      vi.mocked(prisma.category.findMany).mockResolvedValue([mockCategory as never]);
      const result = await categoryRepository.findAll();
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { _count: { select: { products: true } } },
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return a category when found', async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as never);
      const result = await categoryRepository.findById('cat-id-1');
      expect(result).toEqual(mockCategory);
    });

    it('should return null when not found', async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValue(null);
      const result = await categoryRepository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a category', async () => {
      vi.mocked(prisma.category.create).mockResolvedValue(mockCategory as never);
      const input = { name: 'Konica 512i Solvent Ink', hsnCode: '3215', gstRate: 18 };
      const result = await categoryRepository.create(input);
      expect(prisma.category.create).toHaveBeenCalledWith({ data: input });
      expect(result).toEqual(mockCategory);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updated = { ...mockCategory, hsnCode: '3216' };
      vi.mocked(prisma.category.update).mockResolvedValue(updated as never);
      const result = await categoryRepository.update('cat-id-1', { hsnCode: '3216' });
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-id-1' },
        data: { hsnCode: '3216' },
      });
      expect(result.hsnCode).toBe('3216');
    });
  });
});
