import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ConflictError } from '@/lib/errors';
import { CreateBrandInput, UpdateBrandInput } from '@/validations/brand';

export class BrandRepository {
  async findAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    const { search, isActive, skip, take } = params;
    const where: Prisma.BrandWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      prisma.brand.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prisma.brand.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.brand.findUnique({ where: { id } });
  }

  async create(data: CreateBrandInput) {
    return prisma.brand.create({ data });
  }

  async update(id: string, data: UpdateBrandInput) {
    return prisma.brand.update({ where: { id }, data });
  }

  async delete(id: string) {
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { productLines: true } } },
    });
    if (!brand) return;

    if (brand._count.productLines > 0) {
      throw new ConflictError(
        `Cannot delete '${brand.name}': it is in use by ${brand._count.productLines} product line(s) — deactivate it instead.`
      );
    }

    await prisma.brand.delete({ where: { id } });
  }
}

export const brandRepository = new BrandRepository();
