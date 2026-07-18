import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { asyncHandler } from '@/lib/asyncHandler';
import { successResponse, NotFoundError, BadRequestError } from '@/lib/errors';

export const GET = asyncHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const purchase = await prisma.purchase.findUnique({
      where: { id: id },
      include: {
        vendor: { select: { name: true, phone: true, email: true, address: true } },
        items: {
          include: {
            product: {
              select: { name: true, unit: true, category: { select: { hsnCode: true, gstRate: true } } },
            },
          },
        },
        stockTxns: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundError('Purchase not found');
    }

    const formattedStockTxns = purchase.stockTxns.map((txn) => ({
      productId: txn.productId,
      productName: txn.product.name,
      changeQty: txn.changeQty,
      stockBefore: txn.stockBefore,
      stockAfter: txn.stockAfter,
      reason: txn.reason,
      createdAt: txn.createdAt,
    }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { stockTxns: _, ...restPurchase } = purchase;
    const response = {
      ...restPurchase,
      stockTransactions: formattedStockTxns,
    };

    return successResponse(response);
  }
);

export const DELETE = asyncHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const purchase = await prisma.purchase.findUnique({
      where: { id: id },
      include: { items: true },
    });

    if (!purchase) {
      throw new NotFoundError('Purchase not found');
    }

    if (purchase.isCancelled) {
      throw new BadRequestError('PURCHASE_ALREADY_CANCELLED');
    }

    const productIds = purchase.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const reversedItems: { item: (typeof purchase.items)[0]; product: (typeof products)[0] }[] = [];

    for (const item of purchase.items) {
      const product = productMap.get(item.productId)!;
      const currentStock = Number(product.currentStock);
      const itemQty = Number(item.quantity);
      if (currentStock - itemQty < 0) {
        throw new BadRequestError('INSUFFICIENT_STOCK_FOR_CANCELLATION');
      }
      reversedItems.push({ item, product });
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.purchase.update({
        where: { id: id },
        data: { isCancelled: true },
      });

      const freshProducts = await tx.product.findMany({ where: { id: { in: productIds } } });
      const runningStock = new Map(freshProducts.map((p) => [p.id, Number(p.currentStock)]));

      const stockReversed = [];
      const stockTxnData = [];

      for (const { item, product } of reversedItems) {
        const freshStock = runningStock.get(product.id)!;
        const itemQty = Number(item.quantity);

        if (freshStock - itemQty < 0) {
          throw new BadRequestError('INSUFFICIENT_STOCK_FOR_CANCELLATION');
        }

        const stockAfter = freshStock - itemQty;
        runningStock.set(product.id, stockAfter);

        stockTxnData.push({
          productId: product.id,
          changeQty: -itemQty,
          stockBefore: freshStock,
          stockAfter,
          reason: 'PURCHASE_CANCELLED',
          purchaseId: purchase.id,
        });

        stockReversed.push({ productId: product.id, qty: item.quantity });
      }

      await tx.stockTransaction.createMany({ data: stockTxnData });

      for (const [productId, finalStock] of runningStock) {
        await tx.product.update({ where: { id: productId }, data: { currentStock: finalStock } });
      }

      return { success: true, stockReversed };
    });

    return successResponse(result);
  }
);
