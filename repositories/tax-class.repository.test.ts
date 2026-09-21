import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taxClassRepository } from './tax-class.repository';
import prisma from '@/lib/prisma';
import { ConflictError } from '@/lib/errors';

vi.mock('@/lib/prisma', () => ({
  default: {
    taxClass: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockTaxClass = {
  id: 'tc-id-1',
  name: 'Ink',
  hsnCode: '3215',
  gstRate: 18,
  sortOrder: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TaxClassRepository.delete', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('throws ConflictError when referenced by a product line', async () => {
    vi.mocked(prisma.taxClass.findUnique).mockResolvedValue({
      ...mockTaxClass,
      _count: { productLines: 1, products: 0 },
    } as never);

    await expect(taxClassRepository.delete('tc-id-1')).rejects.toThrow(ConflictError);
    expect(prisma.taxClass.delete).not.toHaveBeenCalled();
  });

  it('throws ConflictError when referenced by a product override', async () => {
    vi.mocked(prisma.taxClass.findUnique).mockResolvedValue({
      ...mockTaxClass,
      _count: { productLines: 0, products: 3 },
    } as never);

    await expect(taxClassRepository.delete('tc-id-1')).rejects.toThrow(ConflictError);
    expect(prisma.taxClass.delete).not.toHaveBeenCalled();
  });

  it('deletes the tax class when unreferenced', async () => {
    vi.mocked(prisma.taxClass.findUnique).mockResolvedValue({
      ...mockTaxClass,
      _count: { productLines: 0, products: 0 },
    } as never);
    vi.mocked(prisma.taxClass.delete).mockResolvedValue(mockTaxClass as never);

    await taxClassRepository.delete('tc-id-1');

    expect(prisma.taxClass.delete).toHaveBeenCalledWith({ where: { id: 'tc-id-1' } });
  });

  it('is a no-op when the tax class does not exist', async () => {
    vi.mocked(prisma.taxClass.findUnique).mockResolvedValue(null);
    await taxClassRepository.delete('missing');
    expect(prisma.taxClass.delete).not.toHaveBeenCalled();
  });
});
