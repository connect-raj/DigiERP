import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface ProductWriteData {
  lineId: string;
  name: string;
  unitId: string;
  packSize?: number | null;
  colourId?: string | null;
  specs?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  taxClassId?: string | null;
  basePrice?: number;
  lowerStockLimit?: number;
  isActive?: boolean;
}

// Include both the product's own (override) tax class and the line's tax
// class, so callers can resolve the effective one (own if set, else the
// line's) without a second query.
const productDetailInclude = {
  line: { include: { taxClass: true } },
  unit: true,
  colour: true,
  taxClass: true,
  vendorProducts: {
    select: {
      id: true,
      isPreferred: true,
      vendor: { select: { id: true, name: true } },
    },
  },
  stockTxns: {
    orderBy: { createdAt: 'desc' as const },
    take: 10,
  },
};

const productListInclude = {
  line: { select: { id: true, name: true, kind: true, taxClass: true } },
  unit: { select: { id: true, name: true } },
  colour: { select: { id: true, name: true } },
  taxClass: true,
};

export class ProductRepository {
  async findAll(params: {
    lineId?: string;
    isActive?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const { lineId, isActive, search, skip, take } = params;
    const where: Prisma.ProductWhereInput = {
      ...(lineId && { lineId }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { line: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productListInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: productDetailInclude,
    });
  }

  async create(data: ProductWriteData) {
    return prisma.product.create({ data, include: productDetailInclude });
  }

  async update(id: string, data: Partial<ProductWriteData>) {
    return prisma.product.update({ where: { id }, data, include: productDetailInclude });
  }

  async softDelete(id: string) {
    return prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async hasOpenChallans(id: string): Promise<boolean> {
    // An "open challan" is a dispatch entry still awaiting billing (not cancelled)
    // that references this product.
    const count = await prisma.dispatchEntryItem.count({
      where: {
        productId: id,
        dispatchEntry: { status: 'PENDING_BILLING', isCancelled: false },
      },
    });
    return count > 0;
  }

  async getStock(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        currentStock: true,
        lowerStockLimit: true,
        stockTxns: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) return null;

    const current = Number(product.currentStock);
    const lowerLimit = Number(product.lowerStockLimit);

    return {
      current,
      lowerLimit,
      isLow: current <= lowerLimit,
      transactions: product.stockTxns,
    };
  }

  async adjustStock(id: string, quantity: number, reason: string, performedById?: string) {
    return prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
      const product = await tx.product.findUniqueOrThrow({ where: { id } });

      const stockBefore = new Decimal(product.currentStock.toString());
      const changeQty = new Decimal(quantity.toString());
      const stockAfter = stockBefore.add(changeQty);

      await tx.stockTransaction.create({
        data: {
          productId: id,
          changeQty,
          stockBefore,
          stockAfter,
          reason,
          performedById,
        },
      });

      return tx.product.update({
        where: { id },
        data: { currentStock: stockAfter },
      });
    });
  }
}

export const productRepository = new ProductRepository();
