import { lineRoleRepository } from '@/repositories/line-role.repository';
import { NotFoundError } from '@/lib/errors';
import { CreateLineRoleInput, UpdateLineRoleInput } from '@/validations/line-role';

export class LineRoleService {
  async getAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    return lineRoleRepository.findAll(params);
  }

  async getById(id: string) {
    const lineRole = await lineRoleRepository.findById(id);
    if (!lineRole) {
      throw new NotFoundError(`LineRole with id '${id}' not found`);
    }
    return lineRole;
  }

  async create(data: CreateLineRoleInput) {
    return lineRoleRepository.create(data);
  }

  async update(id: string, data: UpdateLineRoleInput) {
    await this.getById(id);
    return lineRoleRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    await lineRoleRepository.delete(id);
  }
}

export const lineRoleService = new LineRoleService();
