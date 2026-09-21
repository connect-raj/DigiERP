import { printheadRepository } from '@/repositories/printhead.repository';
import { NotFoundError } from '@/lib/errors';
import { CreatePrintheadInput, UpdatePrintheadInput } from '@/validations/printhead';

export class PrintheadService {
  async getAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    return printheadRepository.findAll(params);
  }

  async getById(id: string) {
    const printhead = await printheadRepository.findById(id);
    if (!printhead) {
      throw new NotFoundError(`Printhead with id '${id}' not found`);
    }
    return printhead;
  }

  async create(data: CreatePrintheadInput) {
    return printheadRepository.create(data);
  }

  async update(id: string, data: UpdatePrintheadInput) {
    await this.getById(id);
    return printheadRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    await printheadRepository.delete(id);
  }
}

export const printheadService = new PrintheadService();
