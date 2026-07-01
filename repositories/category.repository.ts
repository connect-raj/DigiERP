import prisma from '@/lib/prisma';
import { CreateCategoryInput, UpdateCategoryInput } from '@/validations/category';

export class CategoryRepository {
  async findAll() {
    return prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  async create(data: CreateCategoryInput) {
    return prisma.category.create({ data });
  }

  async update(id: string, data: UpdateCategoryInput) {
    return prisma.category.update({ where: { id }, data });
  }
}

export const categoryRepository = new CategoryRepository();
