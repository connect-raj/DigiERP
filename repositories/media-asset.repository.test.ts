import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mediaAssetRepository } from './media-asset.repository';
import prisma from '@/lib/prisma';
import { ConflictError } from '@/lib/errors';

vi.mock('@/lib/prisma', () => ({
  default: {
    mediaAsset: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockAsset = {
  id: 'asset-id-1',
  publicId: 'digierp-cms/abc123',
  resourceType: 'image',
  url: 'https://res.cloudinary.com/demo/image/upload/abc123.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 12345,
  width: 800,
  height: 600,
  altText: null,
  createdAt: new Date(),
};

describe('MediaAssetRepository.delete', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('throws ConflictError when the asset is referenced by a gallery item', async () => {
    vi.mocked(prisma.mediaAsset.findUnique).mockResolvedValue({
      ...mockAsset,
      _count: { galleryItems: 1 },
    } as never);

    await expect(mediaAssetRepository.delete('asset-id-1')).rejects.toThrow(ConflictError);
    expect(prisma.mediaAsset.delete).not.toHaveBeenCalled();
  });

  it('deletes and returns the asset when it is not referenced by any gallery item', async () => {
    vi.mocked(prisma.mediaAsset.findUnique).mockResolvedValue({
      ...mockAsset,
      _count: { galleryItems: 0 },
    } as never);
    vi.mocked(prisma.mediaAsset.delete).mockResolvedValue(mockAsset as never);

    const result = await mediaAssetRepository.delete('asset-id-1');

    expect(prisma.mediaAsset.delete).toHaveBeenCalledWith({ where: { id: 'asset-id-1' } });
    expect(result).toMatchObject({ publicId: 'digierp-cms/abc123', resourceType: 'image' });
  });

  it('returns null and is a no-op when the asset does not exist', async () => {
    vi.mocked(prisma.mediaAsset.findUnique).mockResolvedValue(null);
    const result = await mediaAssetRepository.delete('missing');
    expect(result).toBeNull();
    expect(prisma.mediaAsset.delete).not.toHaveBeenCalled();
  });
});
