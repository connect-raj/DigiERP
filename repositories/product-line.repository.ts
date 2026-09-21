import prisma from '@/lib/prisma';
import { Prisma, ProductKind } from '@prisma/client';
import { ConflictError } from '@/lib/errors';

export interface ProductLineFilters {
  search?: string;
  kind?: ProductKind;
  isActive?: boolean;
  skip?: number;
  take?: number;
}

export interface ProductLineWriteData {
  kind: ProductKind;
  name: string;
  slug: string;
  brandId?: string | null;
  technologyId?: string | null;
  formatId?: string | null;
  roleId?: string | null;
  colourSetId?: string | null;
  taxClassId: string;
  invoiceName?: string | null;
  aliases?: string[];
  isActive?: boolean;
  printheadIds?: string[];
}

const productLineInclude = {
  brand: true,
  technology: true,
  format: true,
  role: true,
  colourSet: {
    include: {
      colours: {
        include: { colour: true },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
  },
  taxClass: true,
  heads: {
    include: { printhead: true },
  },
};

export class ProductLineRepository {
  async findAll(filters: ProductLineFilters) {
    const { search, kind, isActive, skip, take } = filters;
    const where: Prisma.ProductLineWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(kind && { kind }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      prisma.productLine.findMany({
        where,
        include: productLineInclude,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.productLine.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.productLine.findUnique({ where: { id }, include: productLineInclude });
  }

  async create(data: ProductLineWriteData) {
    const { printheadIds, ...rest } = data;
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const productLine = await tx.productLine.create({ data: rest });

      if (printheadIds && printheadIds.length > 0) {
        await tx.lineHead.createMany({
          data: printheadIds.map((printheadId) => ({
            lineId: productLine.id,
            printheadId,
          })),
        });
      }

      return tx.productLine.findUniqueOrThrow({
        where: { id: productLine.id },
        include: productLineInclude,
      });
    });
  }

  async update(id: string, data: Partial<ProductLineWriteData>) {
    const { printheadIds, ...rest } = data;
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.productLine.update({ where: { id }, data: rest });

      if (printheadIds !== undefined) {
        await tx.lineHead.deleteMany({ where: { lineId: id } });
        if (printheadIds.length > 0) {
          await tx.lineHead.createMany({
            data: printheadIds.map((printheadId) => ({
              lineId: id,
              printheadId,
            })),
          });
        }
      }

      return tx.productLine.findUniqueOrThrow({ where: { id }, include: productLineInclude });
    });
  }

  async delete(id: string) {
    const productLine = await prisma.productLine.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!productLine) return;

    if (productLine._count.products > 0) {
      throw new ConflictError(
        `Cannot delete '${productLine.name}': it is in use by ${productLine._count.products} product(s) — deactivate it instead.`
      );
    }

    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.lineHead.deleteMany({ where: { lineId: id } });
        await tx.productLine.delete({ where: { id } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictError(
          `Cannot delete '${productLine.name}': it is still referenced by other records — deactivate it instead.`
        );
      }
      throw error;
    }
  }
}

export const productLineRepository = new ProductLineRepository();
