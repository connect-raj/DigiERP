import { describe, it, expect, vi, beforeEach } from 'vitest';
import { galleryApplicationTypeRepository } from './gallery-application-type.repository';
import prisma from '@/lib/prisma';
import { ConflictError } from '@/lib/errors';

vi.mock('@/lib/prisma', () => ({
  default: {
    galleryApplicationType: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockType = {
  id: 'type-id-1',
  name: 'Signage',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GalleryApplicationTypeRepository.delete', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('throws ConflictError when the type is referenced by a gallery item', async () => {
    vi.mocked(prisma.galleryApplicationType.findUnique).mockResolvedValue({
      ...mockType,
      _count: { galleryItems: 3 },
    } as never);

    await expect(galleryApplicationTypeRepository.delete('type-id-1')).rejects.toThrow(
      ConflictError
    );
    expect(prisma.galleryApplicationType.delete).not.toHaveBeenCalled();
  });

  it('deletes the type when it is not referenced by any gallery item', async () => {
    vi.mocked(prisma.galleryApplicationType.findUnique).mockResolvedValue({
      ...mockType,
      _count: { galleryItems: 0 },
    } as never);
    vi.mocked(prisma.galleryApplicationType.delete).mockResolvedValue(mockType as never);

    await galleryApplicationTypeRepository.delete('type-id-1');

    expect(prisma.galleryApplicationType.delete).toHaveBeenCalledWith({
      where: { id: 'type-id-1' },
    });
  });

  it('is a no-op when the type does not exist', async () => {
    vi.mocked(prisma.galleryApplicationType.findUnique).mockResolvedValue(null);
    await galleryApplicationTypeRepository.delete('missing');
    expect(prisma.galleryApplicationType.delete).not.toHaveBeenCalled();
  });
});
