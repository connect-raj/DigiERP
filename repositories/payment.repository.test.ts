import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordStatus } from '@prisma/client';
import { paymentRepository, CreatePaymentData } from './payment.repository';
import prisma from '@/lib/prisma';
import { BadRequestError, NotFoundError } from '@/lib/errors';

// A single tx client is reused for both the top-level mock and the $transaction callback.
const txClient = {
  invoice: { findMany: vi.fn() },
  paymentAllocation: { groupBy: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  payment: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
};

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn(),
    payment: { findUnique: vi.fn(), update: vi.fn() },
    invoice: { findMany: vi.fn() },
    paymentAllocation: { groupBy: vi.fn() },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // route $transaction(fn) through our controllable tx client
  vi.mocked(prisma.$transaction).mockImplementation(((fn: (tx: typeof txClient) => unknown) =>
    fn(txClient)) as never);
  txClient.paymentAllocation.groupBy.mockResolvedValue([]);
});

function baseData(overrides: Partial<CreatePaymentData> = {}): CreatePaymentData {
  return {
    customerId: 'cust-1',
    amount: 8000,
    mode: 'CASH',
    date: new Date('2026-07-01'),
    allocations: [],
    ...overrides,
  };
}

describe('createPaymentWithAllocations', () => {
  it('rejects when allocated total exceeds the payment amount', async () => {
    const data = baseData({
      amount: 5000,
      allocations: [{ invoiceId: null, amount: 6000 }],
    });
    await expect(paymentRepository.createPaymentWithAllocations(data)).rejects.toMatchObject({
      code: 'ALLOCATION_EXCEEDS_PAYMENT',
    });
    expect(txClient.payment.create).not.toHaveBeenCalled();
  });

  it('rejects when an allocation exceeds the invoice balance due', async () => {
    txClient.invoice.findMany.mockResolvedValue([
      { id: 'inv-1', customerId: 'cust-1', totalAmount: 3000, status: RecordStatus.ACTIVE },
    ]);
    txClient.paymentAllocation.groupBy.mockResolvedValue([
      { invoiceId: 'inv-1', _sum: { amount: 2500 } }, // 500 already left
    ]);
    const data = baseData({
      amount: 8000,
      allocations: [{ invoiceId: 'inv-1', amount: 2000 }],
    });
    await expect(paymentRepository.createPaymentWithAllocations(data)).rejects.toMatchObject({
      code: 'ALLOCATION_EXCEEDS_INVOICE_BALANCE',
    });
  });

  it('rejects an invoice belonging to a different customer', async () => {
    txClient.invoice.findMany.mockResolvedValue([
      { id: 'inv-1', customerId: 'other', totalAmount: 3000, status: RecordStatus.ACTIVE },
    ]);
    const data = baseData({ allocations: [{ invoiceId: 'inv-1', amount: 1000 }] });
    await expect(paymentRepository.createPaymentWithAllocations(data)).rejects.toMatchObject({
      code: 'INVOICE_CUSTOMER_MISMATCH',
    });
  });

  it('creates the payment + allocations for the ₹8,000 mixed split (₹2,000 + ₹6,000 on-account)', async () => {
    txClient.invoice.findMany.mockResolvedValue([
      { id: 'inv-1', customerId: 'cust-1', totalAmount: 2000, status: RecordStatus.ACTIVE },
    ]);
    txClient.payment.create.mockResolvedValue({ id: 'pay-1' });

    const data = baseData({
      amount: 8000,
      allocations: [
        { invoiceId: 'inv-1', amount: 2000 },
        { invoiceId: null, amount: 6000 },
      ],
    });
    await paymentRepository.createPaymentWithAllocations(data);

    expect(txClient.payment.create).toHaveBeenCalledTimes(1);
    const arg = txClient.payment.create.mock.calls[0][0];
    expect(arg.data.amount).toBe(8000);
    expect(arg.data.allocations.create).toEqual([
      expect.objectContaining({ invoiceId: 'inv-1', amount: 2000 }),
      expect.objectContaining({ invoiceId: null, amount: 6000 }),
    ]);
  });

  it('allows an unallocated remainder (no forced full allocation)', async () => {
    txClient.payment.create.mockResolvedValue({ id: 'pay-1' });
    const data = baseData({ amount: 8000, allocations: [] });
    await expect(paymentRepository.createPaymentWithAllocations(data)).resolves.toBeDefined();
    expect(txClient.payment.create).toHaveBeenCalled();
  });
});

describe('voidPayment', () => {
  it('throws NotFound when the payment does not exist', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);
    await expect(paymentRepository.voidPayment('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('is an idempotent no-op when already voided', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'pay-1',
      status: RecordStatus.VOID,
    } as never);
    await paymentRepository.voidPayment('pay-1');
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('flips an ACTIVE payment to VOID', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'pay-1',
      status: RecordStatus.ACTIVE,
    } as never);
    vi.mocked(prisma.payment.update).mockResolvedValue({ id: 'pay-1' } as never);
    await paymentRepository.voidPayment('pay-1');
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: { status: RecordStatus.VOID },
    });
  });
});

describe('updateAllocations', () => {
  it('rejects editing a voided payment', async () => {
    txClient.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      customerId: 'cust-1',
      amount: 8000,
      status: RecordStatus.VOID,
    });
    await expect(
      paymentRepository.updateAllocations('pay-1', [{ invoiceId: null, amount: 100 }])
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('replaces the allocation set for an ACTIVE payment', async () => {
    txClient.payment.findUnique
      .mockResolvedValueOnce({
        id: 'pay-1',
        customerId: 'cust-1',
        amount: 8000,
        status: RecordStatus.ACTIVE,
      })
      .mockResolvedValueOnce({ id: 'pay-1', allocations: [] });
    txClient.invoice.findMany.mockResolvedValue([
      { id: 'inv-2', customerId: 'cust-1', totalAmount: 6000, status: RecordStatus.ACTIVE },
    ]);

    await paymentRepository.updateAllocations('pay-1', [{ invoiceId: 'inv-2', amount: 6000 }]);

    expect(txClient.paymentAllocation.deleteMany).toHaveBeenCalledWith({
      where: { paymentId: 'pay-1' },
    });
    expect(txClient.paymentAllocation.createMany).toHaveBeenCalled();
  });
});
