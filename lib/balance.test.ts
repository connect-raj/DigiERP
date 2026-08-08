import { describe, it, expect } from 'vitest';
import { RecordStatus } from '@prisma/client';
import {
  getInvoiceBalance,
  getCustomerPendingTotal,
  getInvoiceDisplayStatus,
  getPaymentOnAccount,
  sumAllocations,
} from './balance';

const ACTIVE = RecordStatus.ACTIVE;
const VOID = RecordStatus.VOID;

describe('getInvoiceBalance', () => {
  it('is the full total when there are no allocations', () => {
    expect(getInvoiceBalance(5000, [])).toBe(5000);
  });

  it('subtracts active allocations (partial)', () => {
    expect(getInvoiceBalance(5000, [{ amount: 2000, paymentStatus: ACTIVE }])).toBe(3000);
  });

  it('is zero when fully allocated', () => {
    expect(
      getInvoiceBalance(5000, [
        { amount: 2000, paymentStatus: ACTIVE },
        { amount: 3000, paymentStatus: ACTIVE },
      ])
    ).toBe(0);
  });

  it('excludes allocations from voided payments (void restores balance)', () => {
    expect(
      getInvoiceBalance(5000, [
        { amount: 2000, paymentStatus: ACTIVE },
        { amount: 3000, paymentStatus: VOID },
      ])
    ).toBe(3000);
  });

  it('accepts Decimal-like string amounts', () => {
    expect(getInvoiceBalance('5000.00', [{ amount: '1500.50', paymentStatus: ACTIVE }])).toBe(
      3499.5
    );
  });
});

describe('getCustomerPendingTotal', () => {
  it('is invoiced minus received', () => {
    expect(
      getCustomerPendingTotal({
        invoices: [{ totalAmount: 10000, status: ACTIVE }],
        payments: [{ amount: 4000, status: ACTIVE }],
      })
    ).toBe(6000);
  });

  it('nets on-account credit (payment exceeding invoices goes negative/credit)', () => {
    expect(
      getCustomerPendingTotal({
        invoices: [{ totalAmount: 2000, status: ACTIVE }],
        payments: [{ amount: 8000, status: ACTIVE }],
      })
    ).toBe(-6000);
  });

  it('excludes voided invoices and payments', () => {
    expect(
      getCustomerPendingTotal({
        invoices: [
          { totalAmount: 10000, status: ACTIVE },
          { totalAmount: 5000, status: VOID },
        ],
        payments: [
          { amount: 4000, status: ACTIVE },
          { amount: 1000, status: VOID },
        ],
      })
    ).toBe(6000);
  });

  it('folds an OPENING_BALANCE invoice in with no special case', () => {
    // opening balance is just another ACTIVE invoice total
    expect(
      getCustomerPendingTotal({
        invoices: [
          { totalAmount: 50000, status: ACTIVE }, // opening balance
          { totalAmount: 10000, status: ACTIVE }, // standard invoice
        ],
        payments: [{ amount: 15000, status: ACTIVE }],
      })
    ).toBe(45000);
  });

  it('produces identical math regardless of billing mode (mode is not an input)', () => {
    const input = {
      invoices: [{ totalAmount: 8000, status: ACTIVE }],
      payments: [{ amount: 8000, status: ACTIVE }],
    };
    // there is no mode parameter — the same call is the answer for BILL_WISE and OPEN_BALANCE
    expect(getCustomerPendingTotal(input)).toBe(0);
  });
});

describe('the ₹8,000 mixed split (acceptance example)', () => {
  // ₹8,000 payment: ₹2,000 to a specific invoice + ₹6,000 on-account
  const paymentAmount = 8000;
  const allocations = [
    { invoiceId: 'inv-machine', amount: 2000 },
    { invoiceId: null, amount: 6000 }, // on-account
  ];

  it('records ₹6,000 as on-account', () => {
    expect(getPaymentOnAccount(paymentAmount, allocations)).toBe(6000);
    expect(sumAllocations(allocations)).toBe(8000);
  });

  it('leaves the machine invoice with the reduced balance', () => {
    expect(getInvoiceBalance(2000, [{ amount: 2000, paymentStatus: ACTIVE }])).toBe(0);
  });

  it('after reassigning the ₹6,000 to another invoice, on-account is 0', () => {
    const reassigned = [
      { invoiceId: 'inv-machine', amount: 2000 },
      { invoiceId: 'inv-other', amount: 6000 },
    ];
    expect(getPaymentOnAccount(paymentAmount, reassigned)).toBe(0);
  });
});

describe('getInvoiceDisplayStatus', () => {
  it('UNPAID when nothing applied', () => {
    expect(getInvoiceDisplayStatus(5000, 5000)).toBe('UNPAID');
  });
  it('PARTIAL when some applied', () => {
    expect(getInvoiceDisplayStatus(5000, 3000)).toBe('PARTIAL');
  });
  it('PAID when balance is zero', () => {
    expect(getInvoiceDisplayStatus(5000, 0)).toBe('PAID');
  });
  it('PAID when overpaid (defensive)', () => {
    expect(getInvoiceDisplayStatus(5000, -100)).toBe('PAID');
  });
});
