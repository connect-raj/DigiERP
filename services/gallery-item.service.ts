import { Prisma } from '@prisma/client';
import { galleryItemRepository, GalleryItemFilters } from '@/repositories/gallery-item.repository';
import { CreateGalleryItemInput, UpdateGalleryItemInput } from '@/validations/gallery-item';
import { NotFoundError, BadRequestError } from '@/lib/errors';

export class GalleryItemService {
  async getAll(filters: GalleryItemFilters) {
    return galleryItemRepository.findAll(filters);
  }

  async getById(id: string) {
    const item = await galleryItemRepository.findById(id);
    if (!item) {
      throw new NotFoundError(`Gallery item with id '${id}' not found`);
    }
    return item;
  }

  async create(data: CreateGalleryItemInput) {
    try {
      return await galleryItemRepository.create(data);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async update(id: string, data: UpdateGalleryItemInput) {
    await this.getById(id);
    try {
      return await galleryItemRepository.update(id, data);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async delete(id: string) {
    await this.getById(id);
    await galleryItemRepository.delete(id);
  }

  private mapWriteError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return new BadRequestError(
        'Application type, image, or product line reference is invalid.',
        'INVALID_REFERENCE'
      );
    }
    return error;
  }
}

export const galleryItemService = new GalleryItemService();
