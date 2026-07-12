import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { CreateCategoryInput, UpdateCategoryInput } from '@/validations/category';

export class CategoryRepository {
  async findAll(params: { search?: string; skip?: number; take?: number }) {
    const { search, skip, take } = params;
    const where: Prisma.CategoryWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { hsnCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, aggregate] = await Promise.all([
      prisma.category.findMany({
        where,
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.category.aggregate({ where, _count: true, _avg: { gstRate: true } }),
    ]);

    return { data, total: aggregate._count, avgGstRate: Number(aggregate._avg.gstRate ?? 0) };
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
