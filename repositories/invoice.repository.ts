import prisma from '@/lib/prisma';
import { Prisma, PaymentStatus } from '@prisma/client';
import { BadRequestError } from '@/lib/errors';
import { generateInvoiceNo } from '@/lib/invoice-no';
import { InvoiceSnapshot } from '@/lib/invoice-pdf';

export interface InvoiceFilters {
  customerId?: string;
  paymentStatus?: PaymentStatus;
  from?: Date;
  to?: Date;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateInvoiceItemInput {
  productId: string;
  productName: string;
  categoryName: string;
  hsnCode: string;
  unit: string;
  quantity: number;
  price: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface CreateInvoiceData {
  dispatchEntryId: string;
  customerId: string;
  date: Date;
  place: string;
  transport?: string | null;
  totalAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  items: CreateInvoiceItemInput[];
  company: InvoiceSnapshot['company'];
  customerSnapshot: InvoiceSnapshot['customer'];
  dispatchReference: {
    challanNo: string;
    dispatchDate: Date;
  };
}

function buildInvoiceWhere(filters: InvoiceFilters): Prisma.InvoiceWhereInput {
  const { customerId, paymentStatus, from, to, search } = filters;

  const where: Prisma.InvoiceWhereInput = {};
  if (customerId) where.customerId = customerId;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = from;
    if (to) where.date.lte = to;
  }
  if (search) {
    where.invoiceNo = { contains: search, mode: 'insensitive' };
  }
  return where;
}

export class InvoiceRepository {
  async findAll(filters: InvoiceFilters) {
    const where = buildInvoiceWhere(filters);

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, firmName: true } },
          dispatchEntry: { select: { id: true, challanNo: true } },
        },
        orderBy: { date: 'desc' },
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { data, total };
  }

  /** Narrow, unbounded query over the same filters — powers the stat tiles without paging. */
  async findStatsRows(filters: InvoiceFilters) {
    const where = buildInvoiceWhere(filters);
    return prisma.invoice.findMany({
      where,
      select: { totalAmount: true, paidAmount: true, paymentStatus: true },
    });
  }

  async findById(id: string) {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firmName: true, state: true, gstin: true } },
        dispatchEntry: { select: { id: true, challanNo: true, date: true } },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findSnapshotById(id: string) {
    return prisma.invoice.findUnique({
      where: { id },
      select: { invoiceNo: true, snapshot: true },
    });
  }

  async findDispatchEntryForInvoicing(dispatchEntryId: string) {
    return prisma.dispatchEntry.findUnique({
      where: { id: dispatchEntryId },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    });
  }

  async findSettings() {
    return prisma.settings.findFirst();
  }

  async createInvoiceTx(data: CreateInvoiceData) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const invoiceNo = await generateInvoiceNo(tx, data.date);

      const snapshot: InvoiceSnapshot = {
        company: data.company,
        customer: data.customerSnapshot,
        invoice: {
          invoiceNo,
          date: data.date.toISOString(),
          place: data.place,
          transport: data.transport ?? null,
        },
        dispatchReference: {
          challanNo: data.dispatchReference.challanNo,
          dispatchDate: data.dispatchReference.dispatchDate.toISOString(),
        },
        items: data.items.map((item) => ({
          productName: item.productName,
          categoryName: item.categoryName,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          cgst: item.cgst,
          sgst: item.sgst,
          igst: item.igst,
          lineTotal: item.lineTotal,
        })),
        totals: {
          totalAmount: data.totalAmount,
          totalCgst: data.totalCgst,
          totalSgst: data.totalSgst,
          totalIgst: data.totalIgst,
        },
      };

      let invoice;
      try {
        invoice = await tx.invoice.create({
          data: {
            invoiceNo,
            dispatchEntryId: data.dispatchEntryId,
            customerId: data.customerId,
            date: data.date,
            place: data.place,
            transport: data.transport,
            totalAmount: data.totalAmount,
            totalCgst: data.totalCgst,
            totalSgst: data.totalSgst,
            totalIgst: data.totalIgst,
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                cgst: item.cgst,
                sgst: item.sgst,
                igst: item.igst,
                lineTotal: item.lineTotal,
              })),
            },
          },
          include: { items: true },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new BadRequestError(
            'This dispatch entry has already been invoiced',
            'DISPATCH_ENTRY_ALREADY_BILLED'
          );
        }
        throw error;
      }

      await tx.dispatchEntry.update({
        where: { id: data.dispatchEntryId },
        data: { status: 'BILLED' },
      });

      await tx.customer.update({
        where: { id: data.customerId },
        data: { outstandingBalance: { increment: data.totalAmount } },
      });

      const uniqueProductIds = [...new Set(data.items.map((item) => item.productId))];
      const priceByProduct = new Map(data.items.map((item) => [item.productId, item.price]));

      for (const productId of uniqueProductIds) {
        const price = priceByProduct.get(productId)!;
        const existing = await tx.customerPrice.findUnique({
          where: { customerId_productId: { customerId: data.customerId, productId } },
        });

        if (!existing || !existing.isManual) {
          await tx.customerPrice.upsert({
            where: { customerId_productId: { customerId: data.customerId, productId } },
            create: {
              customerId: data.customerId,
              productId,
              price,
              isManual: false,
            },
            update: {
              price,
              isManual: false,
            },
          });
        }

        await tx.priceHistory.create({
          data: {
            customerId: data.customerId,
            productId,
            price,
            source: 'AUTO_INVOICE',
          },
        });
      }

      return invoice;
    });
  }
}

export const invoiceRepository = new InvoiceRepository();
