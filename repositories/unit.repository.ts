import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ConflictError } from '@/lib/errors';
import { CreateUnitInput, UpdateUnitInput } from '@/validations/unit';

export class UnitRepository {
  async findAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    const { search, isActive, skip, take } = params;
    const where: Prisma.UnitWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prisma.unit.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.unit.findUnique({ where: { id } });
  }

  async create(data: CreateUnitInput) {
    return prisma.unit.create({ data });
  }

  async update(id: string, data: UpdateUnitInput) {
    return prisma.unit.update({ where: { id }, data });
  }

  async delete(id: string) {
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!unit) return;

    if (unit._count.products > 0) {
      throw new ConflictError(
        `Cannot delete '${unit.name}': it is in use by ${unit._count.products} product(s) — deactivate it instead.`
      );
    }

    await prisma.unit.delete({ where: { id } });
  }
}

export const unitRepository = new UnitRepository();
