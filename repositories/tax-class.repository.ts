import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ConflictError } from '@/lib/errors';
import { CreateTaxClassInput, UpdateTaxClassInput } from '@/validations/tax-class';

export class TaxClassRepository {
  async findAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    const { search, isActive, skip, take } = params;
    const where: Prisma.TaxClassWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { hsnCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      prisma.taxClass.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prisma.taxClass.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.taxClass.findUnique({ where: { id } });
  }

  async create(data: CreateTaxClassInput) {
    return prisma.taxClass.create({ data });
  }

  async update(id: string, data: UpdateTaxClassInput) {
    return prisma.taxClass.update({ where: { id }, data });
  }

  async delete(id: string) {
    const taxClass = await prisma.taxClass.findUnique({
      where: { id },
      include: { _count: { select: { productLines: true, products: true } } },
    });
    if (!taxClass) return;

    const referencedCount = taxClass._count.productLines + taxClass._count.products;
    if (referencedCount > 0) {
      throw new ConflictError(
        `Cannot delete '${taxClass.name}': it is in use by ${taxClass._count.productLines} product line(s) and ${taxClass._count.products} product(s) — deactivate it instead.`
      );
    }

    await prisma.taxClass.delete({ where: { id } });
  }
}

export const taxClassRepository = new TaxClassRepository();
