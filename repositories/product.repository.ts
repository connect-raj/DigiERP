import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateProductInput, UpdateProductInput } from '@/validations/product';

export class ProductRepository {
  async findAll(params: {
    categoryId?: string;
    isActive?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const { categoryId, isActive, search, skip, take } = params;
    const where: Prisma.ProductWhereInput = {
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { category: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          vendorProducts: {
            include: { vendor: true },
          },
        },
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
      include: {
        category: true,
        vendorProducts: {
          include: { vendor: true },
        },
        stockTxns: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async create(data: CreateProductInput) {
    return prisma.product.create({ data });
  }

  async update(id: string, data: UpdateProductInput) {
    return prisma.product.update({ where: { id }, data });
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
