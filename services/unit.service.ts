import { unitRepository } from '@/repositories/unit.repository';
import { NotFoundError } from '@/lib/errors';
import { CreateUnitInput, UpdateUnitInput } from '@/validations/unit';

export class UnitService {
  async getAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    return unitRepository.findAll(params);
  }

  async getById(id: string) {
    const unit = await unitRepository.findById(id);
    if (!unit) {
      throw new NotFoundError(`Unit with id '${id}' not found`);
    }
    return unit;
  }

  async create(data: CreateUnitInput) {
    return unitRepository.create(data);
  }

  async update(id: string, data: UpdateUnitInput) {
    await this.getById(id);
    return unitRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    await unitRepository.delete(id);
  }
}

export const unitService = new UnitService();
