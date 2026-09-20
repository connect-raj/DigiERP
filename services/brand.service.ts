import { brandRepository } from '@/repositories/brand.repository';
import { NotFoundError } from '@/lib/errors';
import { CreateBrandInput, UpdateBrandInput } from '@/validations/brand';

export class BrandService {
  async getAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    return brandRepository.findAll(params);
  }

  async getById(id: string) {
    const brand = await brandRepository.findById(id);
    if (!brand) {
      throw new NotFoundError(`Brand with id '${id}' not found`);
    }
    return brand;
  }

  async create(data: CreateBrandInput) {
    return brandRepository.create(data);
  }

  async update(id: string, data: UpdateBrandInput) {
    await this.getById(id);
    return brandRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    await brandRepository.delete(id);
  }
}

export const brandService = new BrandService();
