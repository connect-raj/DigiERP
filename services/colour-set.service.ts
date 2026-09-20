import { colourSetRepository } from '@/repositories/colour-set.repository';
import { NotFoundError } from '@/lib/errors';
import { CreateColourSetInput, UpdateColourSetInput } from '@/validations/colour-set';

export class ColourSetService {
  async getAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    return colourSetRepository.findAll(params);
  }

  async getById(id: string) {
    const colourSet = await colourSetRepository.findById(id);
    if (!colourSet) {
      throw new NotFoundError(`Colour set with id '${id}' not found`);
    }
    return colourSet;
  }

  async create(data: CreateColourSetInput) {
    return colourSetRepository.create(data);
  }

  async update(id: string, data: UpdateColourSetInput) {
    await this.getById(id);
    return colourSetRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    await colourSetRepository.delete(id);
  }
}

export const colourSetService = new ColourSetService();
