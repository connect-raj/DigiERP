import { technologyRepository } from '@/repositories/technology.repository';
import { NotFoundError } from '@/lib/errors';
import { CreateTechnologyInput, UpdateTechnologyInput } from '@/validations/technology';

export class TechnologyService {
  async getAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    return technologyRepository.findAll(params);
  }

  async getById(id: string) {
    const technology = await technologyRepository.findById(id);
    if (!technology) {
      throw new NotFoundError(`Technology with id '${id}' not found`);
    }
    return technology;
  }

  async create(data: CreateTechnologyInput) {
    return technologyRepository.create(data);
  }

  async update(id: string, data: UpdateTechnologyInput) {
    await this.getById(id);
    return technologyRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    await technologyRepository.delete(id);
  }
}

export const technologyService = new TechnologyService();
