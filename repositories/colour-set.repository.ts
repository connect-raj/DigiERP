import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ConflictError } from '@/lib/errors';
import { CreateColourSetInput, UpdateColourSetInput } from '@/validations/colour-set';

const colourSetInclude = {
  colours: {
    include: { colour: true },
    orderBy: { sortOrder: 'asc' as const },
  },
};

export class ColourSetRepository {
  async findAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    const { search, isActive, skip, take } = params;
    const where: Prisma.ColourSetWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      prisma.colourSet.findMany({
        where,
        include: colourSetInclude,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prisma.colourSet.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.colourSet.findUnique({ where: { id }, include: colourSetInclude });
  }

  async create(data: CreateColourSetInput) {
    const { colourIds, ...rest } = data;
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const colourSet = await tx.colourSet.create({ data: rest });
      await tx.colourSetColour.createMany({
        data: colourIds.map((colourId, index) => ({
          colourSetId: colourSet.id,
          colourId,
          sortOrder: index,
        })),
      });
      return tx.colourSet.findUniqueOrThrow({
        where: { id: colourSet.id },
        include: colourSetInclude,
      });
    });
  }

  async update(id: string, data: UpdateColourSetInput) {
    const { colourIds, ...rest } = data;
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.colourSet.update({ where: { id }, data: rest });

      if (colourIds) {
        await tx.colourSetColour.deleteMany({ where: { colourSetId: id } });
        await tx.colourSetColour.createMany({
          data: colourIds.map((colourId, index) => ({
            colourSetId: id,
            colourId,
            sortOrder: index,
          })),
        });
      }

      return tx.colourSet.findUniqueOrThrow({ where: { id }, include: colourSetInclude });
    });
  }

  async delete(id: string) {
    const colourSet = await prisma.colourSet.findUnique({
      where: { id },
      include: { _count: { select: { productLines: true } } },
    });
    if (!colourSet) return;

    if (colourSet._count.productLines > 0) {
      throw new ConflictError(
        `Cannot delete '${colourSet.name}': it is in use by ${colourSet._count.productLines} product line(s) — deactivate it instead.`
      );
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.colourSetColour.deleteMany({ where: { colourSetId: id } });
      await tx.colourSet.delete({ where: { id } });
    });
  }
}

export const colourSetRepository = new ColourSetRepository();
