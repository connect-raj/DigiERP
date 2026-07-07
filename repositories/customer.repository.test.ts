import { describe, it, expect, vi, beforeEach } from 'vitest';
import { customerRepository } from './customer.repository';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    customer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customerPrice: {
      findMany: vi.fn(),
    },
  },
}));

describe('CustomerRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('uses an empty where clause when no search term is given', async () => {
      vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
      await customerRepository.findAll();
      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { firmName: 'asc' },
      });
    });

    it('searches across firmName, gstin, and city when a search term is given', async () => {
      vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
      await customerRepository.findAll('acme');
      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { firmName: { contains: 'acme', mode: 'insensitive' } },
            { gstin: { contains: 'acme', mode: 'insensitive' } },
            { city: { contains: 'acme', mode: 'insensitive' } },
          ],
        },
        orderBy: { firmName: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('defaults creditLimit to 0 when not provided', async () => {
      vi.mocked(prisma.customer.create).mockResolvedValue({} as never);
      await customerRepository.create({ firmName: 'Test Firm', state: 'Gujarat' });
      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ creditLimit: 0 }),
      });
    });

    it('passes through an explicit creditLimit', async () => {
      vi.mocked(prisma.customer.create).mockResolvedValue({} as never);
      await customerRepository.create({
        firmName: 'Test Firm',
        state: 'Gujarat',
        creditLimit: 50000,
      });
      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ creditLimit: 50000 }),
      });
    });
  });

  describe('update', () => {
    it('updates the customer by id', async () => {
      vi.mocked(prisma.customer.update).mockResolvedValue({} as never);
      await customerRepository.update('cust-1', { firmName: 'New Name' });
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { firmName: 'New Name' },
      });
    });
  });

  describe('findPricesByCustomerId', () => {
    it('includes the product relation', async () => {
      vi.mocked(prisma.customerPrice.findMany).mockResolvedValue([]);
      await customerRepository.findPricesByCustomerId('cust-1');
      expect(prisma.customerPrice.findMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1' },
        include: { product: true },
      });
    });
  });
});
