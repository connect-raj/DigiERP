import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ConflictError } from '@/lib/errors';
import { CreateColourInput, UpdateColourInput } from '@/validations/colour';

export class ColourRepository {
  async findAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    const { search, isActive, skip, take } = params;
    const where: Prisma.ColourWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      prisma.colour.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prisma.colour.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.colour.findUnique({ where: { id } });
  }

  async create(data: CreateColourInput) {
    return prisma.colour.create({ data });
  }

  async update(id: string, data: UpdateColourInput) {
    return prisma.colour.update({ where: { id }, data });
  }

  async delete(id: string) {
    const colour = await prisma.colour.findUnique({
      where: { id },
      include: { _count: { select: { products: true, colourSets: true } } },
    });
    if (!colour) return;

    const referencedCount = colour._count.products + colour._count.colourSets;
    if (referencedCount > 0) {
      throw new ConflictError(
        `Cannot delete '${colour.name}': it is in use by ${colour._count.products} product(s) and ${colour._count.colourSets} colour set(s) — deactivate it instead.`
      );
    }

    await prisma.colour.delete({ where: { id } });
  }
}

export const colourRepository = new ColourRepository();
