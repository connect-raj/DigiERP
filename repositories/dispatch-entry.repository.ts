import prisma from '@/lib/prisma';
import { Prisma, DocStatus, RecordStatus } from '@prisma/client';
import { BadRequestError } from '@/lib/errors';
import { getInvoiceBalance, getInvoiceDisplayStatus } from '@/lib/balance';

export interface DispatchEntryFilters {
  customerId?: string;
  status?: DocStatus;
  isCancelled?: boolean;
  from?: Date;
  to?: Date;
  search?: string;
  skip?: number;
  take?: number;
}

export interface DispatchLineItemInput {
  productId: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

export interface CreateDispatchEntryData {
  challanNo: string;
  customerId: string;
  place: string;
  transport?: string;
  transportAmount?: number;
  date: Date;
  totalAmount: number;
  items: DispatchLineItemInput[];
}

export interface StockRestoreItem {
  productId: string;
  productName: string;
  qty: number;
}

export class DispatchEntryRepository {
  async findAll(filters: DispatchEntryFilters) {
    const { customerId, status, isCancelled, from, to, search, skip, take } = filters;

    const where: Prisma.DispatchEntryWhereInput = {
      isCancelled: isCancelled ?? false,
    };
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
    }
    if (search) {
      where.challanNo = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.dispatchEntry.findMany({
        where,
        include: {
          customer: { select: { id: true, firmName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      prisma.dispatchEntry.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    const entry = await prisma.dispatchEntry.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firmName: true, state: true, gstin: true } },
        items: {
          include: {
            product: { select: { name: true, category: { select: { name: true } } } },
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            date: true,
            totalAmount: true,
            paymentAllocations: {
              where: { payment: { status: RecordStatus.ACTIVE } },
              select: { amount: true },
            },
          },
        },
        stockTxns: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    if (!entry) return null;

    // derive the linked invoice's payment status (no stored column)
    const { invoice, ...rest } = entry;
    if (!invoice) return { ...rest, invoice: null };

    const { paymentAllocations, ...invoiceRest } = invoice;
    const balanceDue = getInvoiceBalance(
      invoice.totalAmount,
      paymentAllocations.map((a) => ({ amount: a.amount, paymentStatus: RecordStatus.ACTIVE }))
    );
    return {
      ...rest,
      invoice: {
        ...invoiceRest,
        balanceDue,
        paymentStatus: getInvoiceDisplayStatus(invoice.totalAmount, balanceDue),
      },
    };
  }

  async findCustomerById(customerId: string) {
    return prisma.customer.findUnique({ where: { id: customerId } });
  }

  async findProductsByIds(productIds: string[]) {
    return prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true },
    });
  }

  async findCustomerPrices(customerId: string, productIds: string[]) {
    return prisma.customerPrice.findMany({
      where: { customerId, productId: { in: productIds } },
    });
  }

  async createWithStockDecrement(data: CreateDispatchEntryData) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const productIds = [...new Set(data.items.map((item) => item.productId))];
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const stockMap = new Map(products.map((p) => [p.id, Number(p.currentStock)]));

      const requestedByProduct = new Map<string, number>();
      for (const item of data.items) {
        requestedByProduct.set(
          item.productId,
          (requestedByProduct.get(item.productId) ?? 0) + item.quantity
        );
      }

      const insufficient: {
        productId: string;
        productName: string;
        available: number;
        requested: number;
      }[] = [];
      for (const [productId, requested] of requestedByProduct) {
        const available = stockMap.get(productId) ?? 0;
        if (available < requested) {
          const product = products.find((p) => p.id === productId);
          insufficient.push({
            productId,
            productName: product?.name ?? productId,
            available,
            requested,
          });
        }
      }
      if (insufficient.length > 0) {
        throw new BadRequestError(
          'Insufficient stock for one or more items',
          'INSUFFICIENT_STOCK',
          insufficient
        );
      }

      const dispatchEntry = await tx.dispatchEntry.create({
        data: {
          challanNo: data.challanNo,
          customerId: data.customerId,
          place: data.place,
          transport: data.transport,
          transportAmount: data.transportAmount,
          date: data.date,
          totalAmount: data.totalAmount,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: { items: true, customer: true },
      });

      const runningStock = new Map(stockMap);
      const stockTxnData = data.items.map((item) => {
        const stockBefore = runningStock.get(item.productId)!;
        const stockAfter = stockBefore - item.quantity;
        runningStock.set(item.productId, stockAfter);

        return {
          productId: item.productId,
          changeQty: -item.quantity,
          stockBefore,
          stockAfter,
          reason: 'DISPATCH_ENTRY',
          dispatchEntryId: dispatchEntry.id,
        };
      });

      await tx.stockTransaction.createMany({ data: stockTxnData });

      for (const [productId, finalStock] of runningStock) {
        await tx.product.update({ where: { id: productId }, data: { currentStock: finalStock } });
      }

      return dispatchEntry;
    });
  }

  async cancelWithStockRestore(
    id: string,
    items: { productId: string; quantity: number }[]
  ): Promise<StockRestoreItem[]> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.dispatchEntry.update({
        where: { id },
        data: { isCancelled: true },
      });

      const productIds = [...new Set(items.map((item) => item.productId))];
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const restored: StockRestoreItem[] = [];
      const runningStock = new Map(products.map((p) => [p.id, Number(p.currentStock)]));
      const stockTxnData = items.map((item) => {
        const product = productMap.get(item.productId)!;
        const stockBefore = runningStock.get(item.productId)!;
        const stockAfter = stockBefore + item.quantity;
        runningStock.set(item.productId, stockAfter);

        restored.push({
          productId: item.productId,
          productName: product.name,
          qty: item.quantity,
        });

        return {
          productId: item.productId,
          changeQty: item.quantity,
          stockBefore,
          stockAfter,
          reason: 'DISPATCH_ENTRY_CANCELLED',
          dispatchEntryId: id,
        };
      });

      await tx.stockTransaction.createMany({ data: stockTxnData });

      for (const [productId, finalStock] of runningStock) {
        await tx.product.update({ where: { id: productId }, data: { currentStock: finalStock } });
      }

      return restored;
    });
  }
}

export const dispatchEntryRepository = new DispatchEntryRepository();
