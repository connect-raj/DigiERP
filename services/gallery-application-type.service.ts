import { galleryApplicationTypeRepository } from '@/repositories/gallery-application-type.repository';
import {
  CreateGalleryApplicationTypeInput,
  UpdateGalleryApplicationTypeInput,
} from '@/validations/gallery-application-type';
import { NotFoundError } from '@/lib/errors';

export class GalleryApplicationTypeService {
  async getAll(filters: { search?: string; skip?: number; take?: number }) {
    return galleryApplicationTypeRepository.findAll(filters);
  }

  async getById(id: string) {
    const type = await galleryApplicationTypeRepository.findById(id);
    if (!type) {
      throw new NotFoundError(`Gallery application type with id '${id}' not found`);
    }
    return type;
  }

  async create(data: CreateGalleryApplicationTypeInput) {
    return galleryApplicationTypeRepository.create(data);
  }

  async update(id: string, data: UpdateGalleryApplicationTypeInput) {
    await this.getById(id);
    return galleryApplicationTypeRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    await galleryApplicationTypeRepository.delete(id);
  }
}

export const galleryApplicationTypeService = new GalleryApplicationTypeService();
