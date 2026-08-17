import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dashboardRepository } from './dashboard.repository';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    settings: { findFirst: vi.fn() },
    invoice: { findMany: vi.fn() },
    payment: { findMany: vi.fn(), aggregate: vi.fn() },
    paymentAllocation: { aggregate: vi.fn() },
    purchase: { findMany: vi.fn(), groupBy: vi.fn() },
    invoiceItem: { findMany: vi.fn(), groupBy: vi.fn() },
    product: { findMany: vi.fn() },
    vendor: { findMany: vi.fn() },
    customer: { findMany: vi.fn() },
    dispatchEntry: { findMany: vi.fn() },
  },
}));

describe('DashboardRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const range = {
    start: new Date('2026-07-01T00:00:00.000Z'),
    end: new Date('2026-08-01T00:00:00.000Z'),
  };

  it('findInvoicesInRange filters by date range, STANDARD type, and ACTIVE status', async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
    await dashboardRepository.findInvoicesInRange(range);
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          date: { gte: range.start, lt: range.end },
          type: 'STANDARD',
          status: 'ACTIVE',
        },
      })
    );
  });

  it('sumPaymentsInRange aggregates ACTIVE payments in the given date range', async () => {
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _sum: { amount: 500 } } as never);
    const result = await dashboardRepository.sumPaymentsInRange(range);
    expect(prisma.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: range.start, lt: range.end }, status: 'ACTIVE' },
        _sum: { amount: true },
      })
    );
    expect(result).toBe(500);
  });

  it('findVendorPayables groups ALL non-cancelled purchases by vendor (not period-scoped)', async () => {
    vi.mocked(prisma.purchase.groupBy).mockResolvedValue([
      { vendorId: 'v1', _sum: { totalAmount: 100, paidAmount: 40 } },
    ] as never);
    vi.mocked(prisma.vendor.findMany).mockResolvedValue([
      { id: 'v1', name: 'Vendor One' },
    ] as never);

    const result = await dashboardRepository.findVendorPayables();

    expect(prisma.purchase.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['vendorId'],
        where: { isCancelled: false },
        _sum: { totalAmount: true, paidAmount: true },
      })
    );
    expect(result).toEqual([
      { vendorId: 'v1', vendorName: 'Vendor One', totalAmount: 100, paidAmount: 40 },
    ]);
  });

  it('findTopCategorySalesInRange groups invoice items by product, via the parent invoice date', async () => {
    vi.mocked(prisma.invoiceItem.groupBy).mockResolvedValue([
      { productId: 'p1', _sum: { lineTotal: 250 } },
    ] as never);
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: 'p1', category: { id: 'c1', name: 'Category One' } },
    ] as never);

    const result = await dashboardRepository.findTopCategorySalesInRange(range);

    expect(prisma.invoiceItem.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['productId'],
        where: { invoice: { date: { gte: range.start, lt: range.end } } },
        _sum: { lineTotal: true },
      })
    );
    expect(result).toEqual([{ categoryId: 'c1', categoryName: 'Category One', amount: 250 }]);
  });

  it('sumOnAccountCredit = ACTIVE payments − invoice-directed ACTIVE allocations, floored at 0', async () => {
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _sum: { amount: 10000 } } as never);
    vi.mocked(prisma.paymentAllocation.aggregate).mockResolvedValue({
      _sum: { amount: 7500 },
    } as never);

    const result = await dashboardRepository.sumOnAccountCredit();

    expect(prisma.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'ACTIVE' }, _sum: { amount: true } })
    );
    expect(prisma.paymentAllocation.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { invoiceId: { not: null }, payment: { status: 'ACTIVE' } },
        _sum: { amount: true },
      })
    );
    expect(result).toBe(2500);
  });

  it('findOpenInvoicesForAging returns ACTIVE invoices with allocation + payment status', async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
    await dashboardRepository.findOpenInvoicesForAging();
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
        select: expect.objectContaining({
          paymentAllocations: {
            select: { amount: true, payment: { select: { status: true } } },
          },
        }),
      })
    );
  });

  it('findActiveProducts only returns active products and includes category', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    await dashboardRepository.findActiveProducts();
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        select: expect.objectContaining({
          category: { select: { id: true, name: true } },
        }),
      })
    );
  });

  it('findAllCustomers does not filter by isActive', async () => {
    vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
    await dashboardRepository.findAllCustomers();
    const call = vi.mocked(prisma.customer.findMany).mock.calls[0][0];
    expect(call?.where).toBeUndefined();
  });

  it('findRecentDispatchEntries excludes cancelled entries and applies the limit', async () => {
    vi.mocked(prisma.dispatchEntry.findMany).mockResolvedValue([]);
    await dashboardRepository.findRecentDispatchEntries(15);
    expect(prisma.dispatchEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isCancelled: false },
        orderBy: { date: 'desc' },
        take: 15,
      })
    );
  });

  it('findRecentPurchases excludes cancelled purchases and applies the limit', async () => {
    vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);
    await dashboardRepository.findRecentPurchases(15);
    expect(prisma.purchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isCancelled: false },
        orderBy: { date: 'desc' },
        take: 15,
      })
    );
  });
});
