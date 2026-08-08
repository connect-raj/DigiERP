import prisma from '@/lib/prisma';
import { Prisma, RecordStatus } from '@prisma/client';
import { getInvoiceBalance, getCustomerPendingTotal } from '@/lib/balance';
import { CreateCustomerInput, UpdateCustomerInput } from '@/validations/customer';

export class CustomerRepository {
  async findAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    const { search, isActive, skip, take } = params;
    const where: Prisma.CustomerWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { firmName: { contains: search, mode: 'insensitive' } },
          { gstin: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { firmName: 'asc' },
        skip,
        take,
        include: {
          invoices: { select: { totalAmount: true, status: true } },
          payments: { select: { amount: true, status: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const data = rows.map(({ invoices, payments, ...rest }) => ({
      ...rest,
      pendingTotal: getCustomerPendingTotal({ invoices, payments }),
    }));

    return { data, total };
  }

  async findById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: { select: { totalAmount: true, status: true } },
        payments: { select: { amount: true, status: true } },
      },
    });
    if (!customer) return null;
    const { invoices, payments, ...rest } = customer;
    return { ...rest, pendingTotal: getCustomerPendingTotal({ invoices, payments }) };
  }

  async create(data: CreateCustomerInput) {
    return prisma.customer.create({
      data: {
        firmName: data.firmName,
        state: data.state,
        contactPerson: data.contactPerson,
        address: data.address,
        city: data.city,
        gstin: data.gstin,
        phone: data.phone,
        email: data.email,
        creditLimit: data.creditLimit ?? 0,
      },
    });
  }

  async update(id: string, data: UpdateCustomerInput) {
    return prisma.customer.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.customer.update({ where: { id }, data: { isActive: false } });
  }

  /** Any ACTIVE invoice with a derived balanceDue > 0 keeps the customer financially active. */
  async hasUnpaidInvoices(id: string): Promise<boolean> {
    const invoices = await prisma.invoice.findMany({
      where: { customerId: id, status: RecordStatus.ACTIVE },
      select: {
        totalAmount: true,
        paymentAllocations: {
          where: { payment: { status: RecordStatus.ACTIVE } },
          select: { amount: true },
        },
      },
    });
    return invoices.some((inv) => {
      const balanceDue = getInvoiceBalance(
        inv.totalAmount,
        inv.paymentAllocations.map((a) => ({
          amount: a.amount,
          paymentStatus: RecordStatus.ACTIVE,
        }))
      );
      return balanceDue > 0.005;
    });
  }

  /** Derived running balance: SUM(ACTIVE invoice totals) − SUM(ACTIVE payment amounts). */
  async getPendingTotal(id: string): Promise<number> {
    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { customerId: id },
        select: { totalAmount: true, status: true },
      }),
      prisma.payment.findMany({
        where: { customerId: id },
        select: { amount: true, status: true },
      }),
    ]);
    return getCustomerPendingTotal({ invoices, payments });
  }

  /** A dispatch still awaiting billing (not cancelled) blocks deactivation. */
  async hasOpenDispatch(id: string): Promise<boolean> {
    const count = await prisma.dispatchEntry.count({
      where: { customerId: id, status: 'PENDING_BILLING', isCancelled: false },
    });
    return count > 0;
  }

  async findPricesByCustomerId(customerId: string) {
    return prisma.customerPrice.findMany({
      where: { customerId },
      include: { product: true },
    });
  }

  /** Price-change audit trail for a customer (optionally scoped to one product). */
  async findPriceHistoryByCustomerId(customerId: string, productId?: string) {
    const rows = await prisma.priceHistory.findMany({
      where: { customerId, ...(productId && { productId }) },
      include: { product: { select: { name: true, unit: true } } },
      orderBy: { recordedAt: 'desc' },
    });
    return rows.map((row) => ({ ...row, price: Number(row.price) }));
  }

  /**
   * Set a manually-negotiated price for a customer/product. Marks the price as
   * manual (so auto-invoicing will not overwrite it) and records a MANUAL entry
   * in the price-history audit trail. Returns the price as a plain number.
   */
  async setManualPrice(customerId: string, productId: string, price: number) {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const customerPrice = await tx.customerPrice.upsert({
        where: { customerId_productId: { customerId, productId } },
        create: { customerId, productId, price, isManual: true },
        update: { price, isManual: true },
        include: { product: true },
      });

      await tx.priceHistory.create({
        data: { customerId, productId, price, source: 'MANUAL' },
      });

      return customerPrice;
    });

    return { ...result, price: Number(result.price) };
  }
}

export const customerRepository = new CustomerRepository();
