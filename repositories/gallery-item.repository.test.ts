import { describe, it, expect, vi, beforeEach } from 'vitest';
import { galleryItemRepository } from './gallery-item.repository';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    galleryItem: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('GalleryItemRepository.findAll', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(prisma.galleryItem.findMany).mockResolvedValue([]);
    vi.mocked(prisma.galleryItem.count).mockResolvedValue(0);
  });

  it('builds an empty where clause with no filters', async () => {
    await galleryItemRepository.findAll({});
    expect(prisma.galleryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it('filters by applicationTypeId, relatedProductLineId, and isPublished', async () => {
    await galleryItemRepository.findAll({
      applicationTypeId: 'type-1',
      relatedProductLineId: 'line-1',
      isPublished: true,
    });
    expect(prisma.galleryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { applicationTypeId: 'type-1', relatedProductLineId: 'line-1', isPublished: true },
      })
    );
  });

  it('includes isPublished: false explicitly rather than dropping it', async () => {
    await galleryItemRepository.findAll({ isPublished: false });
    expect(prisma.galleryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isPublished: false } })
    );
  });

  it('orders by displayOrder then createdAt', async () => {
    await galleryItemRepository.findAll({});
    expect(prisma.galleryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }] })
    );
  });
});
