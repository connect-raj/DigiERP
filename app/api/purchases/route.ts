import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '@/lib/asyncHandler';
import { successResponse, paginatedResponse, BadRequestError, NotFoundError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';
import { generatePurchaseNo } from '@/lib/purchase-no';
import { determineGstType } from '@/lib/gst';

const purchaseCreateSchema = z.object({
  vendorId: z.string().uuid(),
  vendorInvoiceNo: z.string().min(1),
  date: z.string().datetime(),
  expectedDeliveryDate: z.string().datetime().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
      })
    )
    .min(1),
});

export const GET = asyncHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId');
  const paymentStatus = searchParams.get('paymentStatus');
  const isCancelled = searchParams.get('isCancelled');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const search = searchParams.get('search');

  const where: Prisma.PurchaseWhereInput = {};
  if (vendorId) where.vendorId = vendorId;
  if (paymentStatus) where.paymentStatus = paymentStatus as PaymentStatus;
  if (isCancelled !== null) where.isCancelled = isCancelled === 'true';

  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  if (search) {
    where.OR = [
      { purchaseNo: { contains: search, mode: 'insensitive' } },
      { vendorInvoiceNo: { contains: search, mode: 'insensitive' } },
    ];
  }

  const { page, limit, skip, take } = parsePagination(searchParams);

  const [purchases, total, statsRows] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: {
        date: 'desc',
      },
      skip,
      take,
    }),
    prisma.purchase.count({ where }),
    // Narrow, unbounded query over the same filters — powers the stat tiles without paging.
    prisma.purchase.findMany({
      where,
      select: {
        totalAmount: true,
        paidAmount: true,
        vendorId: true,
        expectedDeliveryDate: true,
        receivedDate: true,
      },
    }),
  ]);

  const formattedPurchases = purchases.map((p) => ({
    ...p,
    itemCount: p._count.items,
  }));

  const totalValue = statsRows.reduce((acc, p) => acc + Number(p.totalAmount), 0);
  const pendingPayments = statsRows.reduce(
    (acc, p) => acc + (Number(p.totalAmount) - Number(p.paidAmount)),
    0
  );
  const activeVendors = new Set(statsRows.map((p) => p.vendorId)).size;
  const totalExpected = statsRows.filter((p) => p.expectedDeliveryDate).length;
  const fulfilled = statsRows.filter(
    (p) => p.expectedDeliveryDate && p.receivedDate && p.receivedDate <= p.expectedDeliveryDate
  ).length;
  const procurementHealth = totalExpected > 0 ? Math.round((fulfilled / totalExpected) * 100) : 100;

  return paginatedResponse(
    formattedPurchases,
    { page, limit, total },
    { summary: { totalValue, pendingPayments, activeVendors, procurementHealth } }
  );
});

export const POST = asyncHandler(async (request: NextRequest) => {
  const body = await request.json();
  const parsed = purchaseCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError('Invalid request body');
  }

  const data = parsed.data;

  const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
  if (!vendor) {
    throw new NotFoundError('Vendor not found');
  }

  const settings = await prisma.settings.findFirst();
  if (!settings) {
    throw new BadRequestError('Company settings are not configured', 'SETTINGS_NOT_CONFIGURED');
  }

  const productIds = data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { category: true },
  });

  if (products.length !== productIds.length) {
    throw new BadRequestError('One or more products not found');
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const gstType = determineGstType(settings.companyState, vendor.state);

  let totalAmount = 0;
  let totalGst = 0;

  const purchaseItemsData = data.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const gstRate = Number(product.category.gstRate);
    const qty = item.quantity;
    const price = item.unitPrice;
    const itemBaseTotal = qty * price;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (gstType === 'CGST_SGST') {
      cgst = (itemBaseTotal * (gstRate / 2)) / 100;
      sgst = (itemBaseTotal * (gstRate / 2)) / 100;
    } else {
      igst = (itemBaseTotal * gstRate) / 100;
    }

    const lineGst = cgst + sgst + igst;
    const lineTotal = itemBaseTotal + lineGst;

    totalGst += lineGst;
    totalAmount += lineTotal;

    return {
      productId: item.productId,
      quantity: qty,
      unitPrice: price,
      cgst,
      sgst,
      igst,
      lineTotal,
    };
  });

  const purchaseNo = await generatePurchaseNo();

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const purchase = await tx.purchase.create({
      data: {
        purchaseNo,
        vendorId: data.vendorId,
        vendorInvoiceNo: data.vendorInvoiceNo,
        date: new Date(data.date),
        expectedDeliveryDate: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : undefined,
        totalAmount,
        totalGst,
        items: {
          create: purchaseItemsData,
        },
      },
      include: {
        items: true,
        vendor: true,
      },
    });

    for (const item of data.items) {
      const product = productMap.get(item.productId)!;
      const stockBefore = Number(product.currentStock);
      const stockAfter = stockBefore + item.quantity;

      await tx.stockTransaction.create({
        data: {
          productId: item.productId,
          changeQty: item.quantity,
          stockBefore,
          stockAfter,
          reason: 'PURCHASE',
          purchaseId: purchase.id,
        },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: stockAfter },
      });
    }

    return purchase;
  });

  return successResponse(result, 201);
});
