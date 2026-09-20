import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ConflictError } from '@/lib/errors';
import { CreateTechnologyInput, UpdateTechnologyInput } from '@/validations/technology';

export class TechnologyRepository {
  async findAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    const { search, isActive, skip, take } = params;
    const where: Prisma.TechnologyWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      prisma.technology.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prisma.technology.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.technology.findUnique({ where: { id } });
  }

  async create(data: CreateTechnologyInput) {
    return prisma.technology.create({ data });
  }

  async update(id: string, data: UpdateTechnologyInput) {
    return prisma.technology.update({ where: { id }, data });
  }

  async delete(id: string) {
    const technology = await prisma.technology.findUnique({
      where: { id },
      include: { _count: { select: { productLines: true } } },
    });
    if (!technology) return;

    if (technology._count.productLines > 0) {
      throw new ConflictError(
        `Cannot delete '${technology.name}': it is in use by ${technology._count.productLines} product line(s) — deactivate it instead.`
      );
    }

    await prisma.technology.delete({ where: { id } });
  }
}

export const technologyRepository = new TechnologyRepository();
