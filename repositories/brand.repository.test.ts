import { describe, it, expect, vi, beforeEach } from 'vitest';
import { brandRepository } from './brand.repository';
import prisma from '@/lib/prisma';
import { ConflictError } from '@/lib/errors';

vi.mock('@/lib/prisma', () => ({
  default: {
    brand: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockBrand = {
  id: 'brand-id-1',
  name: 'Konica',
  sortOrder: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BrandRepository.delete', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('throws ConflictError when the brand is referenced by a product line', async () => {
    vi.mocked(prisma.brand.findUnique).mockResolvedValue({
      ...mockBrand,
      _count: { productLines: 2 },
    } as never);

    await expect(brandRepository.delete('brand-id-1')).rejects.toThrow(ConflictError);
    expect(prisma.brand.delete).not.toHaveBeenCalled();
  });

  it('deletes the brand when it is not referenced by any product line', async () => {
    vi.mocked(prisma.brand.findUnique).mockResolvedValue({
      ...mockBrand,
      _count: { productLines: 0 },
    } as never);
    vi.mocked(prisma.brand.delete).mockResolvedValue(mockBrand as never);

    await brandRepository.delete('brand-id-1');

    expect(prisma.brand.delete).toHaveBeenCalledWith({ where: { id: 'brand-id-1' } });
  });

  it('is a no-op when the brand does not exist', async () => {
    vi.mocked(prisma.brand.findUnique).mockResolvedValue(null);
    await brandRepository.delete('missing');
    expect(prisma.brand.delete).not.toHaveBeenCalled();
  });
});
