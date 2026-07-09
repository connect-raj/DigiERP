import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dashboardRepository } from './dashboard.repository';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    settings: { findFirst: vi.fn() },
    invoice: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
    purchase: { findMany: vi.fn() },
    invoiceItem: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
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

  it('findInvoicesInRange filters by the given date range', async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
    await dashboardRepository.findInvoicesInRange(range);
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: range.start, lt: range.end } },
      })
    );
  });

  it('findPaymentsInRange filters by the given date range', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await dashboardRepository.findPaymentsInRange(range);
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: range.start, lt: range.end } },
      })
    );
  });

  it('findPurchasesInRange excludes cancelled purchases', async () => {
    vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);
    await dashboardRepository.findPurchasesInRange(range);
    expect(prisma.purchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: range.start, lt: range.end }, isCancelled: false },
      })
    );
  });

  it('findInvoiceItemsInRange filters via the parent invoice date', async () => {
    vi.mocked(prisma.invoiceItem.findMany).mockResolvedValue([]);
    await dashboardRepository.findInvoiceItemsInRange(range);
    expect(prisma.invoiceItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { invoice: { date: { gte: range.start, lt: range.end } } },
      })
    );
  });

  it('findActiveProducts only returns active products', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    await dashboardRepository.findActiveProducts();
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } })
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
