import { categoryRepository } from '@/repositories/category.repository';
import { NotFoundError } from '@/lib/errors';
import { CreateCategoryInput, UpdateCategoryInput } from '@/validations/category';

export class CategoryService {
  async getAll() {
    return categoryRepository.findAll();
  }

  async getById(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError(`Category with id '${id}' not found`);
    }
    return category;
  }

  async create(data: CreateCategoryInput) {
    return categoryRepository.create(data);
  }

  async update(id: string, data: UpdateCategoryInput) {
    await this.getById(id);
    return categoryRepository.update(id, data);
  }
}

export const categoryService = new CategoryService();
