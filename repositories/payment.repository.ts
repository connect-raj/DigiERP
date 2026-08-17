import prisma from '@/lib/prisma';
import { Prisma, PaymentMode, RecordStatus, InvoiceType } from '@prisma/client';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import {
  getInvoiceBalance,
  getInvoiceDisplayStatus,
  getPaymentOnAccount,
  round2,
  toNumber,
  type InvoiceDisplayStatus,
} from '@/lib/balance';

export interface PaymentFilters {
  customerId?: string;
  mode?: PaymentMode;
  from?: Date;
  to?: Date;
  search?: string;
  skip?: number;
  take?: number;
}

export interface AllocationInput {
  invoiceId: string | null;
  amount: number;
  note?: string;
}

export interface CreatePaymentData {
  customerId: string;
  amount: number;
  mode: PaymentMode;
  date: Date;
  reference?: string;
  allocations: AllocationInput[];
  recordedById?: string;
}

function buildPaymentWhere(filters: PaymentFilters): Prisma.PaymentWhereInput {
  const { customerId, mode, from, to, search } = filters;
  const where: Prisma.PaymentWhereInput = {};
  if (customerId) where.customerId = customerId;
  if (mode) where.mode = mode;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = from;
    if (to) where.date.lte = to;
  }
  if (search) where.reference = { contains: search, mode: 'insensitive' };
  return where;
}

/**
 * Live SUM of allocations against each invoice from ACTIVE payments.
 * Optionally excludes a payment's own rows (used when re-checking during an allocation edit).
 */
async function appliedByInvoice(
  client: Prisma.TransactionClient,
  invoiceIds: string[],
  excludePaymentId?: string
): Promise<Map<string, number>> {
  if (invoiceIds.length === 0) return new Map();
  const rows = await client.paymentAllocation.groupBy({
    by: ['invoiceId'],
    where: {
      invoiceId: { in: invoiceIds },
      payment: { status: RecordStatus.ACTIVE },
      ...(excludePaymentId ? { paymentId: { not: excludePaymentId } } : {}),
    },
    _sum: { amount: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.invoiceId) map.set(row.invoiceId, toNumber(row._sum.amount ?? 0));
  }
  return map;
}

/**
 * Validate allocation lines against the payment total and each invoice's live balanceDue.
 * Throws BadRequestError (400) on any violation. Returns nothing; caller writes rows.
 */
async function validateAllocations(
  client: Prisma.TransactionClient,
  customerId: string,
  paymentAmount: number,
  allocations: AllocationInput[],
  excludePaymentId?: string
): Promise<void> {
  const allocTotal = round2(allocations.reduce((sum, a) => sum + a.amount, 0));
  if (allocTotal > paymentAmount + 0.005) {
    throw new BadRequestError(
      `Allocated total (${allocTotal}) exceeds the payment amount (${paymentAmount})`,
      'ALLOCATION_EXCEEDS_PAYMENT'
    );
  }

  const invoiceIds = [
    ...new Set(allocations.map((a) => a.invoiceId).filter((id): id is string => id !== null)),
  ];
  if (invoiceIds.length === 0) return;

  const invoices = await client.invoice.findMany({
    where: { id: { in: invoiceIds } },
    select: { id: true, customerId: true, totalAmount: true, status: true },
  });
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));
  const applied = await appliedByInvoice(client, invoiceIds, excludePaymentId);

  // aggregate requested amount per invoice (a payment could hit the same invoice twice)
  const requestedByInvoice = new Map<string, number>();
  for (const a of allocations) {
    if (a.invoiceId === null) continue;
    requestedByInvoice.set(a.invoiceId, (requestedByInvoice.get(a.invoiceId) ?? 0) + a.amount);
  }

  for (const [invoiceId, requested] of requestedByInvoice) {
    const invoice = invoiceMap.get(invoiceId);
    if (!invoice) {
      throw new BadRequestError(`Invoice '${invoiceId}' not found`, 'INVOICE_NOT_FOUND');
    }
    if (invoice.status !== RecordStatus.ACTIVE) {
      throw new BadRequestError(`Invoice '${invoiceId}' is voided`, 'INVOICE_VOIDED');
    }
    if (invoice.customerId !== customerId) {
      throw new BadRequestError(
        `Invoice '${invoiceId}' belongs to a different customer`,
        'INVOICE_CUSTOMER_MISMATCH'
      );
    }
    const balanceDue = round2(toNumber(invoice.totalAmount) - (applied.get(invoiceId) ?? 0));
    if (requested > balanceDue + 0.005) {
      throw new BadRequestError(
        `Allocation (${requested}) exceeds invoice '${invoiceId}' balance due (${balanceDue})`,
        'ALLOCATION_EXCEEDS_INVOICE_BALANCE'
      );
    }
  }
}

export class PaymentRepository {
  async findAll(filters: PaymentFilters) {
    const where = buildPaymentWhere(filters);
    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          customer: { select: { id: true, firmName: true } },
          recordedBy: { select: { id: true, username: true } },
          allocations: { select: { invoiceId: true, amount: true } },
        },
        orderBy: { date: 'desc' },
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.payment.count({ where }),
    ]);

    const mapped = data.map(({ allocations, ...p }) => ({
      ...p,
      onAccount: getPaymentOnAccount(p.amount, allocations),
    }));
    return { data: mapped, total };
  }

  /** Narrow rows for the stat tiles — ACTIVE payments only. */
  async findStatsRows(filters: PaymentFilters) {
    const where = { ...buildPaymentWhere(filters), status: RecordStatus.ACTIVE };
    return prisma.payment.findMany({
      where,
      select: { amount: true, allocations: { select: { invoiceId: true, amount: true } } },
    });
  }

  async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firmName: true } },
        recordedBy: { select: { id: true, username: true } },
        allocations: {
          include: { invoice: { select: { id: true, invoiceNo: true, type: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByCustomerId(customerId: string) {
    const payments = await prisma.payment.findMany({
      where: { customerId },
      select: {
        id: true,
        amount: true,
        mode: true,
        reference: true,
        status: true,
        date: true,
        allocations: { select: { invoiceId: true, amount: true } },
      },
      orderBy: { date: 'desc' },
    });
    return payments.map(({ allocations, ...p }) => ({
      ...p,
      onAccount: getPaymentOnAccount(p.amount, allocations),
    }));
  }

  async findCustomerById(customerId: string) {
    return prisma.customer.findUnique({ where: { id: customerId } });
  }

  async findInvoiceById(invoiceId: string) {
    return prisma.invoice.findUnique({ where: { id: invoiceId } });
  }

  async findAllocationsByInvoiceId(invoiceId: string) {
    return prisma.paymentAllocation.findMany({
      where: { invoiceId },
      include: {
        payment: { select: { id: true, mode: true, reference: true, date: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Create a payment and its allocation rows atomically; rolls back on any invariant failure. */
  async createPaymentWithAllocations(data: CreatePaymentData) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await validateAllocations(tx, data.customerId, data.amount, data.allocations);

      return tx.payment.create({
        data: {
          customerId: data.customerId,
          amount: data.amount,
          mode: data.mode,
          reference: data.reference,
          date: data.date,
          recordedById: data.recordedById,
          allocations: {
            create: data.allocations.map((a) => ({
              invoiceId: a.invoiceId,
              amount: a.amount,
              note: a.note,
            })),
          },
        },
        include: {
          recordedBy: { select: { id: true, username: true } },
          allocations: {
            include: { invoice: { select: { id: true, invoiceNo: true, type: true } } },
          },
        },
      });
    });
  }

  /** Replace the full allocation set of an existing ACTIVE payment; re-checks invariants. */
  async updateAllocations(paymentId: string, allocations: AllocationInput[]) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundError(`Payment with id '${paymentId}' not found`);
      if (payment.status !== RecordStatus.ACTIVE) {
        throw new BadRequestError('Cannot edit allocations of a voided payment', 'PAYMENT_VOIDED');
      }

      await validateAllocations(
        tx,
        payment.customerId,
        toNumber(payment.amount),
        allocations,
        paymentId
      );

      await tx.paymentAllocation.deleteMany({ where: { paymentId } });
      if (allocations.length > 0) {
        await tx.paymentAllocation.createMany({
          data: allocations.map((a) => ({
            paymentId,
            invoiceId: a.invoiceId,
            amount: a.amount,
            note: a.note,
          })),
        });
      }

      return tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          allocations: {
            include: { invoice: { select: { id: true, invoiceNo: true, type: true } } },
          },
        },
      });
    });
  }

  /** Soft-void: flip status to VOID. Allocation rows are kept; balances revert via SUM exclusion. */
  async voidPayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError(`Payment with id '${paymentId}' not found`);
    if (payment.status === RecordStatus.VOID) {
      return payment; // idempotent no-op
    }
    return prisma.payment.update({
      where: { id: paymentId },
      data: { status: RecordStatus.VOID },
    });
  }

  /** STANDARD, ACTIVE invoices with a live balanceDue > 0 — feeds the allocation UI. */
  async findOpenInvoices(customerId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { customerId, type: InvoiceType.STANDARD, status: RecordStatus.ACTIVE },
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
      orderBy: { date: 'asc' },
    });

    return invoices
      .map((inv) => {
        const balanceDue = getInvoiceBalance(
          inv.totalAmount,
          inv.paymentAllocations.map((a) => ({
            amount: a.amount,
            paymentStatus: RecordStatus.ACTIVE,
          }))
        );
        return {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          date: inv.date,
          totalAmount: toNumber(inv.totalAmount),
          balanceDue,
        };
      })
      .filter((inv) => inv.balanceDue > 0.005);
  }

  /**
   * Chronological ledger: ACTIVE invoices (debits) and payments (credits) with a running balance,
   * ordered by asOfDate ?? date ?? createdAt. Voided rows are returned flagged but excluded from
   * the running balance.
   */
  async findLedger(customerId: string) {
    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { customerId },
        select: {
          id: true,
          invoiceNo: true,
          type: true,
          status: true,
          date: true,
          asOfDate: true,
          totalAmount: true,
          createdAt: true,
          paymentAllocations: {
            where: { payment: { status: RecordStatus.ACTIVE } },
            select: { amount: true },
          },
        },
      }),
      prisma.payment.findMany({
        where: { customerId },
        select: {
          id: true,
          amount: true,
          mode: true,
          reference: true,
          status: true,
          date: true,
          createdAt: true,
          allocations: {
            select: {
              amount: true,
              invoice: { select: { id: true, invoiceNo: true } },
            },
          },
        },
      }),
    ]);

    type LedgerEntry = {
      kind: 'INVOICE' | 'PAYMENT';
      id: string;
      date: Date;
      sortDate: Date;
      status: RecordStatus;
      debit: number;
      credit: number;
      running: number;
      invoice?: {
        invoiceNo: string | null;
        type: InvoiceType;
        totalAmount: number;
        balanceDue: number;
        displayStatus: InvoiceDisplayStatus;
      };
      payment?: {
        mode: PaymentMode;
        reference: string | null;
        onAccount: number;
        breakdown: { invoiceId: string | null; invoiceNo: string | null; amount: number }[];
      };
    };

    const entries: LedgerEntry[] = [];

    for (const inv of invoices) {
      const balanceDue = getInvoiceBalance(
        inv.totalAmount,
        inv.paymentAllocations.map((a) => ({
          amount: a.amount,
          paymentStatus: RecordStatus.ACTIVE,
        }))
      );
      entries.push({
        kind: 'INVOICE',
        id: inv.id,
        date: inv.date,
        sortDate: inv.asOfDate ?? inv.date ?? inv.createdAt,
        status: inv.status,
        debit: toNumber(inv.totalAmount),
        credit: 0,
        running: 0,
        invoice: {
          invoiceNo: inv.invoiceNo,
          type: inv.type,
          totalAmount: toNumber(inv.totalAmount),
          balanceDue,
          displayStatus: getInvoiceDisplayStatus(inv.totalAmount, balanceDue),
        },
      });
    }

    for (const pay of payments) {
      entries.push({
        kind: 'PAYMENT',
        id: pay.id,
        date: pay.date,
        sortDate: pay.date ?? pay.createdAt,
        status: pay.status,
        debit: 0,
        credit: toNumber(pay.amount),
        running: 0,
        payment: {
          mode: pay.mode,
          reference: pay.reference,
          onAccount: getPaymentOnAccount(
            pay.amount,
            pay.allocations.map((a) => ({
              invoiceId: a.invoice?.id ?? null,
              amount: a.amount,
            }))
          ),
          breakdown: pay.allocations.map((a) => ({
            invoiceId: a.invoice?.id ?? null,
            invoiceNo: a.invoice?.invoiceNo ?? null,
            amount: toNumber(a.amount),
          })),
        },
      });
    }

    entries.sort((a, b) => {
      const diff = a.sortDate.getTime() - b.sortDate.getTime();
      if (diff !== 0) return diff;
      // invoices before payments on the same instant so a same-day payment lands after its invoice
      return a.kind === b.kind ? 0 : a.kind === 'INVOICE' ? -1 : 1;
    });

    let running = 0;
    for (const entry of entries) {
      if (entry.status === RecordStatus.ACTIVE) {
        running = round2(running + entry.debit - entry.credit);
      }
      entry.running = running;
    }

    return entries;
  }
}

export const paymentRepository = new PaymentRepository();
