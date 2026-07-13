import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryService } from './category.service';
import { categoryRepository } from '@/repositories/category.repository';
import { NotFoundError } from '@/lib/errors';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('@/repositories/category.repository', () => ({
  categoryRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const mockCategory = {
  id: 'cat-id-1',
  name: 'Konica 512i Solvent Ink',
  hsnCode: '3215',
  gstRate: new Decimal('18.00'),
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { products: 5 },
};

describe('CategoryService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAll', () => {
    it('should return all categories with total and avg GST rate', async () => {
      vi.spyOn(categoryRepository, 'findAll').mockResolvedValue({
        data: [mockCategory as never],
        total: 1,
        avgGstRate: 18,
      });
      const result = await categoryService.getAll({});
      expect(categoryRepository.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual({ data: [mockCategory], total: 1, avgGstRate: 18 });
    });
  });

  describe('getById', () => {
    it('should return a category when found', async () => {
      vi.spyOn(categoryRepository, 'findById').mockResolvedValue(mockCategory as never);
      const result = await categoryService.getById('cat-id-1');
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundError when category does not exist', async () => {
      vi.spyOn(categoryRepository, 'findById').mockResolvedValue(null);
      await expect(categoryService.getById('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create and return a category', async () => {
      vi.spyOn(categoryRepository, 'create').mockResolvedValue(mockCategory as never);
      const input = { name: 'Konica 512i Solvent Ink', hsnCode: '3215', gstRate: 18 };
      const result = await categoryService.create(input);
      expect(categoryRepository.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockCategory);
    });
  });

  describe('update', () => {
    it('should update a category when found', async () => {
      const updated = { ...mockCategory, hsnCode: '3216' };
      vi.spyOn(categoryRepository, 'findById').mockResolvedValue(mockCategory as never);
      vi.spyOn(categoryRepository, 'update').mockResolvedValue(updated as never);
      const result = await categoryService.update('cat-id-1', { hsnCode: '3216' });
      expect(result.hsnCode).toBe('3216');
    });

    it('should throw NotFoundError if category does not exist', async () => {
      vi.spyOn(categoryRepository, 'findById').mockResolvedValue(null);
      await expect(categoryService.update('bad-id', { hsnCode: '3216' })).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
