import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateProductInput, UpdateProductInput } from '@/validations/product';

export class ProductRepository {
  async findAll(params: { categoryId?: string; isActive?: boolean; search?: string }) {
    const { categoryId, isActive, search } = params;
    return prisma.product.findMany({
      where: {
        ...(categoryId && { categoryId }),
        ...(isActive !== undefined && { isActive }),
        ...(search && {
          name: { contains: search, mode: 'insensitive' },
        }),
      },
      include: {
        category: true,
        vendorProducts: {
          include: { vendor: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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

  async hasOpenChallans(_id: string): Promise<boolean> {
    // No Challan model yet — always false
    return false;
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
    return prisma.$transaction(async (tx) => {
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
