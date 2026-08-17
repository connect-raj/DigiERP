import { RecordStatus } from '@prisma/client';

/**
 * Derived-balance math. Balances are NEVER stored — every figure here is computed
 * from ACTIVE rows at query time. These functions are pure (rows in, number out) so
 * the same logic is reused by repositories and covered by unit tests without a DB.
 *
 * The math is identical for BILL_WISE and OPEN_BALANCE customers — mode only drives
 * default UI, never the numbers. Do not add mode-specific branches here.
 */

export type Decimalish = number | string | { toString(): string };

export function toNumber(value: Decimalish): number {
  return typeof value === 'number' ? value : Number(value.toString());
}

/** Round to 2 decimal places (money) to keep float noise out of comparisons. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface InvoiceAllocationInput {
  amount: Decimalish;
  /** status of the PARENT payment — VOID payments are excluded from every SUM */
  paymentStatus: RecordStatus;
}

/**
 * balanceDue = totalAmount − SUM(allocations to this invoice from ACTIVE payments).
 * Voided payments' allocation rows are kept but excluded here, so voiding restores the balance.
 */
export function getInvoiceBalance(
  totalAmount: Decimalish,
  allocations: InvoiceAllocationInput[]
): number {
  const applied = allocations
    .filter((a) => a.paymentStatus === RecordStatus.ACTIVE)
    .reduce((sum, a) => sum + toNumber(a.amount), 0);
  return round2(toNumber(totalAmount) - applied);
}

export interface PendingTotalInput {
  invoices: { totalAmount: Decimalish; status: RecordStatus }[];
  payments: { amount: Decimalish; status: RecordStatus }[];
}

/**
 * pendingTotal = SUM(ACTIVE invoice totals, incl. OPENING_BALANCE) − SUM(ACTIVE payment amounts).
 *
 * Using the full payment amount (not just invoice-directed allocations) means on-account credit
 * — whether recorded as a null-invoiceId allocation or left as an unallocated remainder — nets
 * out automatically. OPENING_BALANCE invoices are just ACTIVE invoices, so they fold in with no
 * special case.
 */
export function getCustomerPendingTotal({ invoices, payments }: PendingTotalInput): number {
  const invoiced = invoices
    .filter((i) => i.status === RecordStatus.ACTIVE)
    .reduce((sum, i) => sum + toNumber(i.totalAmount), 0);
  const received = payments
    .filter((p) => p.status === RecordStatus.ACTIVE)
    .reduce((sum, p) => sum + toNumber(p.amount), 0);
  return round2(invoiced - received);
}

export type InvoiceDisplayStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

/** Derived pill for STANDARD/OPENING_BALANCE invoices, from live balanceDue. */
export function getInvoiceDisplayStatus(
  totalAmount: Decimalish,
  balanceDue: Decimalish
): InvoiceDisplayStatus {
  const total = toNumber(totalAmount);
  const due = toNumber(balanceDue);
  if (due <= 0.005) return 'PAID';
  if (due >= total - 0.005) return 'UNPAID';
  return 'PARTIAL';
}

export function sumAllocations(allocations: { amount: Decimalish }[]): number {
  return round2(allocations.reduce((sum, a) => sum + toNumber(a.amount), 0));
}

/**
 * On-account (unapplied) portion of a payment = amount − SUM(allocations directed at an invoice).
 * Null-invoiceId allocation rows and pure remainders both count as on-account credit.
 */
export function getPaymentOnAccount(
  amount: Decimalish,
  allocations: { invoiceId: string | null; amount: Decimalish }[]
): number {
  const applied = allocations
    .filter((a) => a.invoiceId !== null)
    .reduce((sum, a) => sum + toNumber(a.amount), 0);
  return round2(toNumber(amount) - applied);
}
