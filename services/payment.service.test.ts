import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentService } from './payment.service';
import { paymentRepository } from '@/repositories/payment.repository';
import { NotFoundError } from '@/lib/errors';
import { CreatePaymentInput } from '@/validations/payment';

vi.mock('@/repositories/payment.repository', () => ({
  paymentRepository: {
    findAll: vi.fn(),
    findStatsRows: vi.fn(),
    findById: vi.fn(),
    findByCustomerId: vi.fn(),
    findAllocationsByInvoiceId: vi.fn(),
    findCustomerById: vi.fn(),
    findInvoiceById: vi.fn(),
    findLedger: vi.fn(),
    findOpenInvoices: vi.fn(),
    createPaymentWithAllocations: vi.fn(),
    updateAllocations: vi.fn(),
    voidPayment: vi.fn(),
  },
}));

describe('PaymentService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('getSummary', () => {
    it('derives allocated/unallocated from on-account portions of ACTIVE payments', async () => {
      vi.mocked(paymentRepository.findStatsRows).mockResolvedValue([
        // 1000 with 800 applied -> 200 on-account
        { amount: 1000, allocations: [{ invoiceId: 'i1', amount: 800 }] },
        // 500 fully on-account (null allocation)
        { amount: 500, allocations: [{ invoiceId: null, amount: 500 }] },
      ] as never);

      const result = await paymentService.getSummary({});

      expect(result).toEqual({
        totalReceived: 1500,
        totalAllocated: 800,
        totalUnallocated: 700,
        count: 2,
      });
    });
  });

  describe('getById', () => {
    it('throws NotFoundError when the payment does not exist', async () => {
      vi.mocked(paymentRepository.findById).mockResolvedValue(null);
      await expect(paymentService.getById('missing')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getByCustomerId', () => {
    it('throws NotFoundError when the customer does not exist', async () => {
      vi.mocked(paymentRepository.findCustomerById).mockResolvedValue(null);
      await expect(paymentService.getByCustomerId('missing')).rejects.toBeInstanceOf(NotFoundError);
      expect(paymentRepository.findByCustomerId).not.toHaveBeenCalled();
    });
  });

  describe('getLedger / getOpenInvoices', () => {
    it('guards ledger on customer existence', async () => {
      vi.mocked(paymentRepository.findCustomerById).mockResolvedValue(null);
      await expect(paymentService.getLedger('missing')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('returns open invoices when the customer exists', async () => {
      vi.mocked(paymentRepository.findCustomerById).mockResolvedValue({ id: 'cust-1' } as never);
      vi.mocked(paymentRepository.findOpenInvoices).mockResolvedValue([{ id: 'inv-1' }] as never);
      const result = await paymentService.getOpenInvoices('cust-1');
      expect(result).toEqual([{ id: 'inv-1' }]);
    });
  });

  describe('create', () => {
    const input: CreatePaymentInput = {
      customerId: 'cust-1',
      amount: 8000,
      mode: 'CASH',
      date: '2026-07-01T00:00:00.000Z',
      allocations: [
        { invoiceId: 'inv-1', amount: 2000 },
        { invoiceId: null, amount: 6000 },
      ],
    };

    it('throws NotFoundError when the customer does not exist', async () => {
      vi.mocked(paymentRepository.findCustomerById).mockResolvedValue(null);
      await expect(paymentService.create(input, 'user-1')).rejects.toBeInstanceOf(NotFoundError);
      expect(paymentRepository.createPaymentWithAllocations).not.toHaveBeenCalled();
    });

    it('forwards allocations + recordedById to the repository', async () => {
      vi.mocked(paymentRepository.findCustomerById).mockResolvedValue({ id: 'cust-1' } as never);
      vi.mocked(paymentRepository.createPaymentWithAllocations).mockResolvedValue({
        id: 'pay-1',
      } as never);

      await paymentService.create(input, 'user-1');

      expect(paymentRepository.createPaymentWithAllocations).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          amount: 8000,
          recordedById: 'user-1',
          allocations: [
            { invoiceId: 'inv-1', amount: 2000, note: undefined },
            { invoiceId: null, amount: 6000, note: undefined },
          ],
        })
      );
    });
  });

  describe('updateAllocations / void', () => {
    it('delegates updateAllocations to the repository', async () => {
      vi.mocked(paymentRepository.updateAllocations).mockResolvedValue({ id: 'pay-1' } as never);
      await paymentService.updateAllocations('pay-1', {
        allocations: [{ invoiceId: 'inv-2', amount: 6000 }],
      });
      expect(paymentRepository.updateAllocations).toHaveBeenCalledWith('pay-1', [
        { invoiceId: 'inv-2', amount: 6000, note: undefined },
      ]);
    });

    it('delegates void to the repository', async () => {
      vi.mocked(paymentRepository.voidPayment).mockResolvedValue({ id: 'pay-1' } as never);
      await paymentService.voidPayment('pay-1');
      expect(paymentRepository.voidPayment).toHaveBeenCalledWith('pay-1');
    });
  });
});
