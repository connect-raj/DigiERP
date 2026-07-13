import prisma from '@/lib/prisma';
import { Prisma, PaymentMode, PaymentStatus } from '@prisma/client';
import { BadRequestError, ConflictError } from '@/lib/errors';

export interface PaymentFilters {
  customerId?: string;
  mode?: PaymentMode;
  from?: Date;
  to?: Date;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreatePaymentData {
  customerId: string;
  amount: number;
  mode: PaymentMode;
  date: Date;
  reference?: string;
  recordedById?: string;
}

export interface AllocationLineInput {
  paymentId: string;
  invoiceId: string;
  amount: number;
}

export interface AllocateBatchData {
  idempotencyKey: string;
  allocations: AllocationLineInput[];
}

interface UpdatedInvoiceResult {
  id: string;
  invoiceNo: string;
  paidAmount: Prisma.Decimal;
  paymentStatus: PaymentStatus;
}

interface UpdatedPaymentResult {
  id: string;
  unallocatedAmount: Prisma.Decimal;
}

interface CreatedAllocationResult {
  id: string;
  paymentId: string;
  invoiceId: string;
  amount: Prisma.Decimal;
  createdAt: Date;
}

export interface AllocateBatchResult {
  replay: boolean;
  batchId: string;
  created: CreatedAllocationResult[];
  updatedInvoices: UpdatedInvoiceResult[];
  updatedPayments: UpdatedPaymentResult[];
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
  if (search) {
    where.reference = { contains: search, mode: 'insensitive' };
  }
  return where;
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
        },
        orderBy: { date: 'desc' },
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.payment.count({ where }),
    ]);

    return { data, total };
  }

  /** Narrow, unbounded query over the same filters — powers the stat tiles without paging. */
  async findStatsRows(filters: PaymentFilters) {
    const where = buildPaymentWhere(filters);
    return prisma.payment.findMany({
      where,
      select: { amount: true, unallocatedAmount: true },
    });
  }

  async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firmName: true } },
        recordedBy: { select: { id: true, username: true } },
        allocations: {
          include: {
            invoice: { select: { id: true, invoiceNo: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByCustomerId(customerId: string) {
    return prisma.payment.findMany({
      where: { customerId },
      select: {
        id: true,
        amount: true,
        unallocatedAmount: true,
        mode: true,
        reference: true,
        date: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findAllocationsByInvoiceId(invoiceId: string) {
    return prisma.paymentAllocation.findMany({
      where: { invoiceId },
      include: {
        payment: { select: { id: true, mode: true, reference: true, date: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCustomerById(customerId: string) {
    return prisma.customer.findUnique({ where: { id: customerId } });
  }

  async findInvoiceById(invoiceId: string) {
    return prisma.invoice.findUnique({ where: { id: invoiceId } });
  }

  async createPaymentTx(data: CreatePaymentData) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payment.create({
        data: {
          customerId: data.customerId,
          amount: data.amount,
          unallocatedAmount: data.amount,
          mode: data.mode,
          reference: data.reference,
          date: data.date,
          recordedById: data.recordedById,
        },
        include: {
          recordedBy: { select: { id: true, username: true } },
        },
      });

      await tx.customer.update({
        where: { id: data.customerId },
        data: { creditBalance: { increment: data.amount } },
      });

      return payment;
    });
  }

  async allocateBatch(data: AllocateBatchData): Promise<AllocateBatchResult> {
    let batch;
    try {
      batch = await prisma.allocationBatch.create({
        data: { idempotencyKey: data.idempotencyKey },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.buildReplayResult(data.idempotencyKey);
      }
      throw error;
    }

    try {
      const paymentIds = [...new Set(data.allocations.map((a) => a.paymentId))];
      const invoiceIds = [...new Set(data.allocations.map((a) => a.invoiceId))];

      const [payments, invoices] = await Promise.all([
        prisma.payment.findMany({ where: { id: { in: paymentIds } } }),
        prisma.invoice.findMany({ where: { id: { in: invoiceIds } } }),
      ]);
      const paymentMap = new Map(payments.map((p) => [p.id, p]));
      const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

      const failures: {
        index: number;
        paymentId: string;
        invoiceId: string;
        reason: string;
      }[] = [];

      data.allocations.forEach((allocation, index) => {
        if (allocation.amount <= 0) {
          failures.push({ ...allocation, index, reason: 'AMOUNT_MUST_BE_POSITIVE' });
          return;
        }
        const payment = paymentMap.get(allocation.paymentId);
        if (!payment) {
          failures.push({ ...allocation, index, reason: 'PAYMENT_NOT_FOUND' });
          return;
        }
        const invoice = invoiceMap.get(allocation.invoiceId);
        if (!invoice) {
          failures.push({ ...allocation, index, reason: 'INVOICE_NOT_FOUND' });
          return;
        }
        if (payment.customerId !== invoice.customerId) {
          failures.push({ ...allocation, index, reason: 'INVOICE_CUSTOMER_MISMATCH' });
          return;
        }
        if (Number(invoice.paidAmount) >= Number(invoice.totalAmount)) {
          failures.push({ ...allocation, index, reason: 'INVOICE_ALREADY_PAID' });
        }
      });

      if (failures.length > 0) {
        throw new BadRequestError(
          'One or more allocations failed validation',
          failures[0].reason,
          failures
        );
      }

      const created: CreatedAllocationResult[] = [];
      const updatedInvoiceMap = new Map<string, UpdatedInvoiceResult>();
      const updatedPaymentMap = new Map<string, UpdatedPaymentResult>();

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const [index, allocation] of data.allocations.entries()) {
          const invoice = invoiceMap.get(allocation.invoiceId)!;
          const maxAllowedPaidAmount = Number(invoice.totalAmount) - allocation.amount;

          const paymentUpdate = await tx.payment.updateMany({
            where: { id: allocation.paymentId, unallocatedAmount: { gte: allocation.amount } },
            data: { unallocatedAmount: { decrement: allocation.amount } },
          });
          if (paymentUpdate.count === 0) {
            throw new ConflictError(
              "Payment's available balance changed before the allocation could be applied; refetch and retry",
              'ALLOCATION_CONFLICT',
              [{ ...allocation, index, reason: 'PAYMENT_BALANCE_INSUFFICIENT' }]
            );
          }

          const invoiceUpdate = await tx.invoice.updateMany({
            where: { id: allocation.invoiceId, paidAmount: { lte: maxAllowedPaidAmount } },
            data: { paidAmount: { increment: allocation.amount } },
          });
          if (invoiceUpdate.count === 0) {
            throw new ConflictError(
              "Invoice's outstanding balance changed before the allocation could be applied; refetch and retry",
              'ALLOCATION_CONFLICT',
              [{ ...allocation, index, reason: 'INVOICE_BALANCE_INSUFFICIENT' }]
            );
          }

          const updatedInvoiceRow = await tx.invoice.findUniqueOrThrow({
            where: { id: allocation.invoiceId },
          });
          const newPaidAmount = Number(updatedInvoiceRow.paidAmount);
          const totalAmount = Number(invoice.totalAmount);
          const paymentStatus: PaymentStatus =
            newPaidAmount <= 0 ? 'UNPAID' : newPaidAmount >= totalAmount ? 'PAID' : 'PARTIAL';

          await tx.invoice.update({
            where: { id: allocation.invoiceId },
            data: { paymentStatus },
          });

          const allocationRow = await tx.paymentAllocation.create({
            data: {
              paymentId: allocation.paymentId,
              invoiceId: allocation.invoiceId,
              batchId: batch.id,
              amount: allocation.amount,
            },
          });

          const updatedPaymentRow = await tx.payment.findUniqueOrThrow({
            where: { id: allocation.paymentId },
          });

          await tx.customer.update({
            where: { id: invoice.customerId },
            data: {
              outstandingBalance: { decrement: allocation.amount },
              creditBalance: { decrement: allocation.amount },
            },
          });

          created.push({
            id: allocationRow.id,
            paymentId: allocationRow.paymentId,
            invoiceId: allocationRow.invoiceId,
            amount: allocationRow.amount,
            createdAt: allocationRow.createdAt,
          });
          updatedInvoiceMap.set(allocation.invoiceId, {
            id: updatedInvoiceRow.id,
            invoiceNo: invoice.invoiceNo,
            paidAmount: updatedInvoiceRow.paidAmount,
            paymentStatus,
          });
          updatedPaymentMap.set(allocation.paymentId, {
            id: updatedPaymentRow.id,
            unallocatedAmount: updatedPaymentRow.unallocatedAmount,
          });
        }
      });

      return {
        replay: false,
        batchId: batch.id,
        created,
        updatedInvoices: [...updatedInvoiceMap.values()],
        updatedPayments: [...updatedPaymentMap.values()],
      };
    } catch (error) {
      await prisma.allocationBatch.delete({ where: { id: batch.id } }).catch(() => undefined);
      throw error;
    }
  }

  private async buildReplayResult(idempotencyKey: string): Promise<AllocateBatchResult> {
    const batch = await prisma.allocationBatch.findUnique({
      where: { idempotencyKey },
      include: {
        allocations: {
          include: { invoice: true, payment: true },
        },
      },
    });

    if (!batch) {
      throw new ConflictError(
        'Allocation batch could not be found for idempotent replay',
        'ALLOCATION_CONFLICT'
      );
    }

    const updatedInvoiceMap = new Map<string, UpdatedInvoiceResult>();
    const updatedPaymentMap = new Map<string, UpdatedPaymentResult>();
    const created: CreatedAllocationResult[] = batch.allocations.map((allocation) => ({
      id: allocation.id,
      paymentId: allocation.paymentId,
      invoiceId: allocation.invoiceId,
      amount: allocation.amount,
      createdAt: allocation.createdAt,
    }));

    for (const allocation of batch.allocations) {
      updatedInvoiceMap.set(allocation.invoiceId, {
        id: allocation.invoice.id,
        invoiceNo: allocation.invoice.invoiceNo,
        paidAmount: allocation.invoice.paidAmount,
        paymentStatus: allocation.invoice.paymentStatus,
      });
      updatedPaymentMap.set(allocation.paymentId, {
        id: allocation.payment.id,
        unallocatedAmount: allocation.payment.unallocatedAmount,
      });
    }

    return {
      replay: true,
      batchId: batch.id,
      created,
      updatedInvoices: [...updatedInvoiceMap.values()],
      updatedPayments: [...updatedPaymentMap.values()],
    };
  }
}

export const paymentRepository = new PaymentRepository();
