import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { CreateCustomerInput, UpdateCustomerInput } from '@/validations/customer';

export class CustomerRepository {
  async findAll(params: {
    search?: string;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }) {
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

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { firmName: 'asc' },
        skip,
        take,
      }),
      prisma.customer.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.customer.findUnique({ where: { id } });
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

  /** Any invoice not fully paid keeps the customer financially active. */
  async hasUnpaidInvoices(id: string): Promise<boolean> {
    const count = await prisma.invoice.count({
      where: { customerId: id, paymentStatus: { not: 'PAID' } },
    });
    return count > 0;
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
}

export const customerRepository = new CustomerRepository();
