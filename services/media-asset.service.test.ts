import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mediaAssetService } from './media-asset.service';
import { mediaAssetRepository } from '@/repositories/media-asset.repository';
import { uploadMediaAsset, deleteMediaAsset } from '@/lib/cloudinary';
import { NotFoundError, BadRequestError } from '@/lib/errors';

vi.mock('@/repositories/media-asset.repository', () => ({
  mediaAssetRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/cloudinary', () => ({
  uploadMediaAsset: vi.fn(),
  deleteMediaAsset: vi.fn(),
}));

function makeFile(content: string, type: string, name = 'test-file') {
  return new File([content], name, { type });
}

const mockAsset = {
  id: 'asset-id-1',
  publicId: 'digierp-cms/abc123',
  resourceType: 'image',
  url: 'https://res.cloudinary.com/demo/image/upload/abc123.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 5,
  width: null,
  height: null,
  altText: null,
  createdAt: new Date(),
};

describe('MediaAssetService.upload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('rejects an unsupported mime type without calling Cloudinary', async () => {
    const file = makeFile('x', 'application/zip');
    await expect(mediaAssetService.upload(file)).rejects.toThrow(BadRequestError);
    expect(uploadMediaAsset).not.toHaveBeenCalled();
  });

  it('rejects a file over the size cap without calling Cloudinary', async () => {
    const oversized = 'x'.repeat(26 * 1024 * 1024);
    const file = makeFile(oversized, 'image/png');
    await expect(mediaAssetService.upload(file)).rejects.toThrow(BadRequestError);
    expect(uploadMediaAsset).not.toHaveBeenCalled();
  });

  it('uploads to Cloudinary and persists the row on a valid file', async () => {
    vi.mocked(uploadMediaAsset).mockResolvedValue({
      publicId: 'digierp-cms/abc123',
      resourceType: 'image',
      url: 'https://res.cloudinary.com/demo/image/upload/abc123.jpg',
      sizeBytes: 5,
    });
    vi.mocked(mediaAssetRepository.create).mockResolvedValue(mockAsset as never);

    const file = makeFile('hello', 'image/jpeg');
    const result = await mediaAssetService.upload(file, 'A photo');

    expect(uploadMediaAsset).toHaveBeenCalledTimes(1);
    expect(mediaAssetRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: 'digierp-cms/abc123',
        mimeType: 'image/jpeg',
        altText: 'A photo',
      })
    );
    expect(result).toEqual(mockAsset);
  });

  it('cleans up the Cloudinary upload if persisting the row fails', async () => {
    vi.mocked(uploadMediaAsset).mockResolvedValue({
      publicId: 'digierp-cms/abc123',
      resourceType: 'image',
      url: 'https://res.cloudinary.com/demo/image/upload/abc123.jpg',
      sizeBytes: 5,
    });
    vi.mocked(mediaAssetRepository.create).mockRejectedValue(new Error('db down'));
    vi.mocked(deleteMediaAsset).mockResolvedValue(undefined);

    const file = makeFile('hello', 'image/jpeg');
    await expect(mediaAssetService.upload(file)).rejects.toThrow('db down');

    expect(deleteMediaAsset).toHaveBeenCalledWith('digierp-cms/abc123', 'image');
  });
});

describe('MediaAssetService.update', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('throws NotFoundError when the asset does not exist', async () => {
    vi.mocked(mediaAssetRepository.findById).mockResolvedValue(null);
    await expect(mediaAssetService.update('missing', { altText: 'x' })).rejects.toThrow(
      NotFoundError
    );
  });
});

describe('MediaAssetService.delete', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('throws NotFoundError when the asset does not exist', async () => {
    vi.mocked(mediaAssetRepository.findById).mockResolvedValue(null);
    await expect(mediaAssetService.delete('missing')).rejects.toThrow(NotFoundError);
  });

  it('deletes the Cloudinary asset after the DB row is removed', async () => {
    vi.mocked(mediaAssetRepository.findById).mockResolvedValue(mockAsset as never);
    vi.mocked(mediaAssetRepository.delete).mockResolvedValue(mockAsset as never);

    await mediaAssetService.delete('asset-id-1');

    expect(deleteMediaAsset).toHaveBeenCalledWith('digierp-cms/abc123', 'image');
  });

  it('skips the Cloudinary call when the repository reports nothing was deleted', async () => {
    vi.mocked(mediaAssetRepository.findById).mockResolvedValue(mockAsset as never);
    vi.mocked(mediaAssetRepository.delete).mockResolvedValue(null);

    await mediaAssetService.delete('asset-id-1');

    expect(deleteMediaAsset).not.toHaveBeenCalled();
  });
});
