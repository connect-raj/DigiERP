import { taxClassRepository } from '@/repositories/tax-class.repository';
import { NotFoundError } from '@/lib/errors';
import { CreateTaxClassInput, UpdateTaxClassInput } from '@/validations/tax-class';

export class TaxClassService {
  async getAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    return taxClassRepository.findAll(params);
  }

  async getById(id: string) {
    const taxClass = await taxClassRepository.findById(id);
    if (!taxClass) {
      throw new NotFoundError(`TaxClass with id '${id}' not found`);
    }
    return taxClass;
  }

  async create(data: CreateTaxClassInput) {
    return taxClassRepository.create(data);
  }

  async update(id: string, data: UpdateTaxClassInput) {
    await this.getById(id);
    return taxClassRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    await taxClassRepository.delete(id);
  }
}

export const taxClassService = new TaxClassService();
