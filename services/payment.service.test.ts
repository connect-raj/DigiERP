import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentService } from './payment.service';
import { paymentRepository } from '@/repositories/payment.repository';
import { NotFoundError } from '@/lib/errors';
import { CreatePaymentInput, AllocatePaymentsInput } from '@/validations/payment';

vi.mock('@/repositories/payment.repository', () => ({
  paymentRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByCustomerId: vi.fn(),
    findAllocationsByInvoiceId: vi.fn(),
    findCustomerById: vi.fn(),
    findInvoiceById: vi.fn(),
    createPaymentTx: vi.fn(),
    allocateBatch: vi.fn(),
  },
}));

describe('PaymentService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('throws NotFoundError when the payment does not exist', async () => {
      vi.mocked(paymentRepository.findById).mockResolvedValue(null);
      await expect(paymentService.getById('missing')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('returns the payment when found', async () => {
      vi.mocked(paymentRepository.findById).mockResolvedValue({ id: 'pay-1' } as never);
      const result = await paymentService.getById('pay-1');
      expect(result).toEqual({ id: 'pay-1' });
    });
  });

  describe('getByCustomerId', () => {
    it('throws NotFoundError when the customer does not exist', async () => {
      vi.mocked(paymentRepository.findCustomerById).mockResolvedValue(null);
      await expect(paymentService.getByCustomerId('missing')).rejects.toBeInstanceOf(NotFoundError);
      expect(paymentRepository.findByCustomerId).not.toHaveBeenCalled();
    });

    it('returns the customer payments when the customer exists', async () => {
      vi.mocked(paymentRepository.findCustomerById).mockResolvedValue({ id: 'cust-1' } as never);
      vi.mocked(paymentRepository.findByCustomerId).mockResolvedValue([{ id: 'pay-1' }] as never);
      const result = await paymentService.getByCustomerId('cust-1');
      expect(result).toEqual([{ id: 'pay-1' }]);
    });
  });

  describe('getAllocationsByInvoiceId', () => {
    it('throws NotFoundError when the invoice does not exist', async () => {
      vi.mocked(paymentRepository.findInvoiceById).mockResolvedValue(null);
      await expect(paymentService.getAllocationsByInvoiceId('missing')).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });

  describe('create', () => {
    it('throws NotFoundError when the customer does not exist', async () => {
      vi.mocked(paymentRepository.findCustomerById).mockResolvedValue(null);
      const input: CreatePaymentInput = {
        customerId: 'missing',
        amount: 500,
        mode: 'BANK_TRANSFER',
        date: '2026-07-01T00:00:00.000Z',
      };
      await expect(paymentService.create(input, 'user-1')).rejects.toBeInstanceOf(NotFoundError);
      expect(paymentRepository.createPaymentTx).not.toHaveBeenCalled();
    });

    it('creates the payment with recordedById from the authenticated user', async () => {
      vi.mocked(paymentRepository.findCustomerById).mockResolvedValue({ id: 'cust-1' } as never);
      vi.mocked(paymentRepository.createPaymentTx).mockResolvedValue({ id: 'pay-1' } as never);

      const input: CreatePaymentInput = {
        customerId: 'cust-1',
        amount: 500,
        mode: 'BANK_TRANSFER',
        date: '2026-07-01T00:00:00.000Z',
        reference: 'REF-1',
      };
      await paymentService.create(input, 'user-1');

      expect(paymentRepository.createPaymentTx).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          amount: 500,
          mode: 'BANK_TRANSFER',
          reference: 'REF-1',
          recordedById: 'user-1',
        })
      );
    });
  });

  describe('allocate', () => {
    it('delegates to paymentRepository.allocateBatch', async () => {
      const input: AllocatePaymentsInput = {
        idempotencyKey: 'idem-1',
        allocations: [{ paymentId: 'pay-1', invoiceId: 'inv-1', amount: 500 }],
      };
      vi.mocked(paymentRepository.allocateBatch).mockResolvedValue({
        replay: false,
        batchId: 'batch-1',
        created: [],
        updatedInvoices: [],
        updatedPayments: [],
      });

      const result = await paymentService.allocate(input);

      expect(paymentRepository.allocateBatch).toHaveBeenCalledWith(input);
      expect(result.replay).toBe(false);
    });
  });
});
