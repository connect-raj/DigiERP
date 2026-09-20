import { formatRepository } from '@/repositories/format.repository';
import { NotFoundError } from '@/lib/errors';
import { CreateFormatInput, UpdateFormatInput } from '@/validations/format';

export class FormatService {
  async getAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    return formatRepository.findAll(params);
  }

  async getById(id: string) {
    const format = await formatRepository.findById(id);
    if (!format) {
      throw new NotFoundError(`Format with id '${id}' not found`);
    }
    return format;
  }

  async create(data: CreateFormatInput) {
    return formatRepository.create(data);
  }

  async update(id: string, data: UpdateFormatInput) {
    await this.getById(id);
    return formatRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    await formatRepository.delete(id);
  }
}

export const formatService = new FormatService();
