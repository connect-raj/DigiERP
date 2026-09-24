import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadMediaAsset, deleteMediaAsset } from './cloudinary';

const uploadStreamMock = vi.fn();
const destroyMock = vi.fn();

vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: (...args: unknown[]) => uploadStreamMock(...args),
      destroy: (...args: unknown[]) => destroyMock(...args),
    },
  },
}));

function fakeUploadStream(result: Record<string, unknown> | null, error: unknown = null) {
  uploadStreamMock.mockImplementation((_options: unknown, callback: (...cbArgs: unknown[]) => void) => {
    callback(error, result);
    return { end: vi.fn() };
  });
}

describe('uploadMediaAsset', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves with the uploaded asset shape on success', async () => {
    fakeUploadStream({
      public_id: 'digierp-cms/abc123',
      resource_type: 'image',
      secure_url: 'https://res.cloudinary.com/demo/image/upload/abc123.jpg',
      bytes: 12345,
      width: 800,
      height: 600,
    });

    const result = await uploadMediaAsset(Buffer.from('fake-image-bytes'));

    expect(result).toEqual({
      publicId: 'digierp-cms/abc123',
      resourceType: 'image',
      url: 'https://res.cloudinary.com/demo/image/upload/abc123.jpg',
      sizeBytes: 12345,
      width: 800,
      height: 600,
    });
  });

  it('rejects when Cloudinary returns an error', async () => {
    fakeUploadStream(null, new Error('upload failed'));
    await expect(uploadMediaAsset(Buffer.from('x'))).rejects.toThrow('upload failed');
  });

  it('rejects when Cloudinary returns neither a result nor an error', async () => {
    fakeUploadStream(null);
    await expect(uploadMediaAsset(Buffer.from('x'))).rejects.toThrow('Cloudinary upload failed');
  });
});

describe('deleteMediaAsset', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls destroy with the public id and matching resource type', async () => {
    destroyMock.mockResolvedValue({ result: 'ok' });
    await deleteMediaAsset('digierp-cms/abc123', 'video');
    expect(destroyMock).toHaveBeenCalledWith('digierp-cms/abc123', { resource_type: 'video' });
  });
});
