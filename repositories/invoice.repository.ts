import prisma from '@/lib/prisma';
import { Prisma, RecordStatus, InvoiceType } from '@prisma/client';
import { BadRequestError } from '@/lib/errors';
import { generateInvoiceNo } from '@/lib/invoice-no';
import { InvoiceSnapshot } from '@/lib/invoice-pdf';
import {
  getInvoiceBalance,
  getInvoiceDisplayStatus,
  type InvoiceDisplayStatus,
} from '@/lib/balance';

export interface InvoiceFilters {
  customerId?: string;
  // derived status filter (Unpaid/Partial/Paid), computed live — not a stored column
  paymentStatus?: InvoiceDisplayStatus;
  from?: Date;
  to?: Date;
  search?: string;
  skip?: number;
  take?: number;
}

// active allocations, used to derive balanceDue on read
const activeAllocationsSelect = {
  where: { payment: { status: RecordStatus.ACTIVE } },
  select: { amount: true },
} as const;

function withDerivedBalance<
  T extends { totalAmount: Prisma.Decimal; paymentAllocations: { amount: Prisma.Decimal }[] },
>(invoice: T) {
  const { paymentAllocations, ...rest } = invoice;
  const balanceDue = getInvoiceBalance(
    invoice.totalAmount,
    paymentAllocations.map((a) => ({ amount: a.amount, paymentStatus: RecordStatus.ACTIVE }))
  );
  return {
    ...rest,
    balanceDue,
    paymentStatus: getInvoiceDisplayStatus(invoice.totalAmount, balanceDue),
  };
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

// The invoice list is STANDARD invoices only; OPENING_BALANCE invoices are a
// customer-level construct surfaced on the ledger, not here.
function buildInvoiceWhere(filters: InvoiceFilters): Prisma.InvoiceWhereInput {
  const { customerId, from, to, search } = filters;

  const where: Prisma.InvoiceWhereInput = {
    type: InvoiceType.STANDARD,
    status: RecordStatus.ACTIVE,
  };
  if (customerId) where.customerId = customerId;
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

    // Balances (and thus display status) are derived, so status filtering and paging happen in
    // code. Volume is <50 invoices/month, so fetching the full matching set is not a concern.
    const rows = await prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, firmName: true } },
        dispatchEntry: { select: { id: true, challanNo: true } },
        paymentAllocations: activeAllocationsSelect,
      },
      orderBy: { date: 'desc' },
    });

    let derived = rows.map(withDerivedBalance);
    if (filters.paymentStatus) {
      derived = derived.filter((inv) => inv.paymentStatus === filters.paymentStatus);
    }

    const total = derived.length;
    const start = filters.skip ?? 0;
    const data =
      filters.take !== undefined
        ? derived.slice(start, start + filters.take)
        : derived.slice(start);

    return { data, total };
  }

  /** Narrow, unbounded query over the same filters — powers the stat tiles without paging. */
  async findStatsRows(filters: InvoiceFilters) {
    const where = buildInvoiceWhere(filters);
    const rows = await prisma.invoice.findMany({
      where,
      select: { totalAmount: true, status: true, paymentAllocations: activeAllocationsSelect },
    });
    return rows.map(withDerivedBalance);
  }

  async findById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firmName: true, state: true, gstin: true } },
        dispatchEntry: { select: { id: true, challanNo: true, date: true } },
        items: { include: { product: true } },
        paymentAllocations: activeAllocationsSelect,
      },
    });
    return invoice ? withDerivedBalance(invoice) : null;
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
    return prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
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

        // No stored balance to bump — customer.pendingTotal is derived from ACTIVE invoices/payments.

        const uniqueProductIds = [...new Set(data.items.map((item) => item.productId))];
        const priceByProduct = new Map(data.items.map((item) => [item.productId, item.price]));

        const existingPrices = await tx.customerPrice.findMany({
          where: {
            customerId: data.customerId,
            productId: { in: uniqueProductIds },
          },
        });

        const existingPricesMap = new Map(existingPrices.map((ep) => [ep.productId, ep]));

        for (const productId of uniqueProductIds) {
          const price = priceByProduct.get(productId)!;
          const existing = existingPricesMap.get(productId);

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
        }

        if (uniqueProductIds.length > 0) {
          await tx.priceHistory.createMany({
            data: uniqueProductIds.map((productId) => ({
              customerId: data.customerId,
              productId,
              price: priceByProduct.get(productId)!,
              source: 'AUTO_INVOICE',
            })),
          });
        }

        return invoice;
      },
      {
        maxWait: 10000,
        timeout: 15000,
      }
    );
  }

  /**
   * Upsert the single OPENING_BALANCE invoice for a customer (one per customer).
   * A one-time migration action, editable later. invoiceNo/snapshot stay null; asOfDate places
   * it in ledger chronology. Folds into pendingTotal like any other ACTIVE invoice.
   */
  async upsertOpeningBalance(customerId: string, totalAmount: number, asOfDate: Date) {
    const existing = await prisma.invoice.findFirst({
      where: { customerId, type: InvoiceType.OPENING_BALANCE },
      select: { id: true },
    });

    if (existing) {
      return prisma.invoice.update({
        where: { id: existing.id },
        data: { totalAmount, asOfDate, status: RecordStatus.ACTIVE },
      });
    }

    return prisma.invoice.create({
      data: {
        customerId,
        type: InvoiceType.OPENING_BALANCE,
        totalAmount,
        asOfDate,
        date: asOfDate,
      },
    });
  }
}

export const invoiceRepository = new InvoiceRepository();
