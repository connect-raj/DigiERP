import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ConflictError } from '@/lib/errors';
import { CreateFormatInput, UpdateFormatInput } from '@/validations/format';

export class FormatRepository {
  async findAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    const { search, isActive, skip, take } = params;
    const where: Prisma.FormatWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      prisma.format.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prisma.format.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.format.findUnique({ where: { id } });
  }

  async create(data: CreateFormatInput) {
    return prisma.format.create({ data });
  }

  async update(id: string, data: UpdateFormatInput) {
    return prisma.format.update({ where: { id }, data });
  }

  async delete(id: string) {
    const format = await prisma.format.findUnique({
      where: { id },
      include: { _count: { select: { productLines: true } } },
    });
    if (!format) return;

    if (format._count.productLines > 0) {
      throw new ConflictError(
        `Cannot delete '${format.name}': it is in use by ${format._count.productLines} product line(s) — deactivate it instead.`
      );
    }

    await prisma.format.delete({ where: { id } });
  }
}

export const formatRepository = new FormatRepository();
