import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { CreateCustomerInput, UpdateCustomerInput } from '@/validations/customer';

export class CustomerRepository {
  async findAll(search?: string) {
    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { firmName: { contains: search, mode: 'insensitive' } },
            { gstin: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    return prisma.customer.findMany({
      where,
      orderBy: { firmName: 'asc' },
    });
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

  async findPricesByCustomerId(customerId: string) {
    return prisma.customerPrice.findMany({
      where: { customerId },
      include: { product: true },
    });
  }
}

export const customerRepository = new CustomerRepository();
