import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ConflictError } from '@/lib/errors';
import { CreatePrintheadInput, UpdatePrintheadInput } from '@/validations/printhead';

export class PrintheadRepository {
  async findAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    const { search, isActive, skip, take } = params;
    const where: Prisma.PrintheadWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      prisma.printhead.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prisma.printhead.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.printhead.findUnique({ where: { id } });
  }

  async create(data: CreatePrintheadInput) {
    return prisma.printhead.create({ data });
  }

  async update(id: string, data: UpdatePrintheadInput) {
    return prisma.printhead.update({ where: { id }, data });
  }

  async delete(id: string) {
    const printhead = await prisma.printhead.findUnique({
      where: { id },
      include: { _count: { select: { lineHeads: true } } },
    });
    if (!printhead) return;

    if (printhead._count.lineHeads > 0) {
      throw new ConflictError(
        `Cannot delete '${printhead.name}': it is in use by ${printhead._count.lineHeads} product line(s) — deactivate it instead.`
      );
    }

    await prisma.printhead.delete({ where: { id } });
  }
}

export const printheadRepository = new PrintheadRepository();
