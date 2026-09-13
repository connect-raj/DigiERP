import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inquiryRepository } from './inquiry.repository';
import prisma from '@/lib/prisma';
import { ConflictError } from '@/lib/errors';

vi.mock('@/lib/prisma', () => ({
  default: {
    inquiry: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockInquiry = {
  id: 'inq-1',
  source: 'WEBSITE',
  status: 'NEW',
  company: 'Acme Prints',
  contactName: 'Jane Doe',
  phone: '9999999999',
  email: null,
  city: null,
  interestCategory: 'INK',
  inkType: null,
  volume: null,
  printerBrand: null,
  currentSupplier: null,
  notes: null,
  convertedCustomerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('InquiryRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findAll', () => {
    beforeEach(() => {
      vi.mocked(prisma.inquiry.count).mockResolvedValue(0);
    });

    it('returns inquiries and total count, sorted by createdAt desc', async () => {
      vi.mocked(prisma.inquiry.findMany).mockResolvedValue([mockInquiry as never]);
      vi.mocked(prisma.inquiry.count).mockResolvedValue(1);

      const result = await inquiryRepository.findAll({});

      expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } })
      );
      expect(result).toEqual({ data: [mockInquiry], total: 1 });
    });

    it('filters by source and status', async () => {
      vi.mocked(prisma.inquiry.findMany).mockResolvedValue([]);
      await inquiryRepository.findAll({ source: 'EXPO', status: 'CONTACTED' });

      expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ source: 'EXPO', status: 'CONTACTED' }),
        })
      );
    });

    it('searches by company, contactName, or phone', async () => {
      vi.mocked(prisma.inquiry.findMany).mockResolvedValue([]);
      await inquiryRepository.findAll({ search: 'acme' });

      expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        })
      );
    });
  });

  describe('findByPhone', () => {
    it('looks up a Customer by exact phone match', async () => {
      vi.mocked(prisma.customer.findFirst).mockResolvedValue(null);
      await inquiryRepository.findByPhone('9999999999');
      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { phone: '9999999999' },
      });
    });
  });

  describe('create', () => {
    it('creates an inquiry with the given source, dropping website_hp', async () => {
      vi.mocked(prisma.inquiry.create).mockResolvedValue(mockInquiry as never);

      await inquiryRepository.create({
        source: 'WEBSITE',
        company: 'Acme Prints',
        contactName: 'Jane Doe',
        phone: '9999999999',
        interestCategory: 'INK',
      });

      expect(prisma.inquiry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: 'WEBSITE', company: 'Acme Prints' }),
        })
      );
    });
  });

  describe('convertToCustomer', () => {
    function mockTx(inquiry: typeof mockInquiry) {
      const tx = {
        inquiry: {
          findUnique: vi.fn().mockResolvedValue(inquiry),
          update: vi.fn().mockResolvedValue({ ...inquiry, status: 'CONVERTED' }),
        },
        customer: {
          create: vi.fn().mockResolvedValue({ id: 'cust-1', firmName: inquiry.company }),
        },
      };
      vi.mocked(prisma.$transaction).mockImplementation(((cb: (tx: unknown) => unknown) =>
        cb(tx)) as typeof prisma.$transaction);
      return tx;
    }

    it('creates a new Customer and marks the inquiry CONVERTED', async () => {
      const tx = mockTx(mockInquiry);

      const result = await inquiryRepository.convertToCustomer('inq-1', 'Maharashtra');

      expect(tx.customer.create).toHaveBeenCalledWith({
        data: { firmName: 'Acme Prints', phone: '9999999999', state: 'Maharashtra' },
      });
      expect(tx.inquiry.update).toHaveBeenCalledWith({
        where: { id: 'inq-1' },
        data: { status: 'CONVERTED', convertedCustomerId: 'cust-1' },
      });
      expect(result.customer).toEqual({ id: 'cust-1', firmName: 'Acme Prints' });
    });

    it('throws ConflictError if the inquiry is already CONVERTED, without creating a Customer', async () => {
      const tx = mockTx({ ...mockInquiry, status: 'CONVERTED' });

      await expect(inquiryRepository.convertToCustomer('inq-1', 'Maharashtra')).rejects.toThrow(
        ConflictError
      );
      expect(tx.customer.create).not.toHaveBeenCalled();
    });

    it('throws ConflictError if the inquiry is already CLOSED, without creating a Customer', async () => {
      const tx = mockTx({ ...mockInquiry, status: 'CLOSED' });

      await expect(inquiryRepository.convertToCustomer('inq-1', 'Maharashtra')).rejects.toThrow(
        ConflictError
      );
      expect(tx.customer.create).not.toHaveBeenCalled();
    });
  });
});
