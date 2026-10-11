import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { galleryItemService } from './gallery-item.service';
import { galleryItemRepository } from '@/repositories/gallery-item.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';

vi.mock('@/repositories/gallery-item.repository', () => ({
  galleryItemRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

function fkViolation() {
  return new Prisma.PrismaClientKnownRequestError('Foreign key constraint violated', {
    code: 'P2003',
    clientVersion: 'test',
  });
}

describe('GalleryItemService.getById', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('throws NotFoundError when no item matches', async () => {
    vi.mocked(galleryItemRepository.findById).mockResolvedValue(null);
    await expect(galleryItemService.getById('missing')).rejects.toThrow(NotFoundError);
  });
});

describe('GalleryItemService.create', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('maps a foreign-key violation to a friendly BadRequestError', async () => {
    vi.mocked(galleryItemRepository.create).mockRejectedValue(fkViolation());

    await expect(
      galleryItemService.create({
        title: 'Storefront signage',
        applicationTypeId: 'bad-id',
        imageId: 'image-1',
      })
    ).rejects.toThrow(BadRequestError);
  });

  it('rethrows unrelated errors unchanged', async () => {
    const dbError = new Error('connection lost');
    vi.mocked(galleryItemRepository.create).mockRejectedValue(dbError);

    await expect(
      galleryItemService.create({
        title: 'Storefront signage',
        applicationTypeId: 'type-1',
        imageId: 'image-1',
      })
    ).rejects.toBe(dbError);
  });
});

describe('GalleryItemService.update', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('throws NotFoundError before attempting the update when the item is missing', async () => {
    vi.mocked(galleryItemRepository.findById).mockResolvedValue(null);
    await expect(galleryItemService.update('missing', { title: 'x' })).rejects.toThrow(
      NotFoundError
    );
    expect(galleryItemRepository.update).not.toHaveBeenCalled();
  });
});
