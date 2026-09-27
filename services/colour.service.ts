import { colourRepository } from '@/repositories/colour.repository';
import { NotFoundError } from '@/lib/errors';
import { CreateColourInput, UpdateColourInput } from '@/validations/colour';

export class ColourService {
  async getAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    return colourRepository.findAll(params);
  }

  async getById(id: string) {
    const colour = await colourRepository.findById(id);
    if (!colour) {
      throw new NotFoundError(`Colour with id '${id}' not found`);
    }
    return colour;
  }

  async create(data: CreateColourInput) {
    return colourRepository.create(data);
  }

  async update(id: string, data: UpdateColourInput) {
    await this.getById(id);
    return colourRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    await colourRepository.delete(id);
  }
}

export const colourService = new ColourService();
