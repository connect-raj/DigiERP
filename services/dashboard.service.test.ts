import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dashboardService } from './dashboard.service';
import { dashboardRepository } from '@/repositories/dashboard.repository';

vi.mock('@/repositories/dashboard.repository', () => ({
  dashboardRepository: {
    findSettings: vi.fn(),
    findInvoicesInRange: vi.fn(),
    sumPaymentsInRange: vi.fn(),
    findVendorPayables: vi.fn(),
    findTopCategorySalesInRange: vi.fn(),
    findActiveProducts: vi.fn(),
    findAllCustomers: vi.fn(),
    sumOnAccountCredit: vi.fn(),
    findOpenInvoicesForAging: vi.fn(),
    findRecentDispatchEntries: vi.fn(),
    findRecentInvoices: vi.fn(),
    findRecentPayments: vi.fn(),
    findRecentPurchases: vi.fn(),
  },
}));

function mockEmptyRepo() {
  vi.spyOn(dashboardRepository, 'findInvoicesInRange').mockResolvedValue([] as never);
  vi.spyOn(dashboardRepository, 'sumPaymentsInRange').mockResolvedValue(0);
  vi.spyOn(dashboardRepository, 'findVendorPayables').mockResolvedValue([] as never);
  vi.spyOn(dashboardRepository, 'findTopCategorySalesInRange').mockResolvedValue([] as never);
  vi.spyOn(dashboardRepository, 'findActiveProducts').mockResolvedValue([] as never);
  vi.spyOn(dashboardRepository, 'findAllCustomers').mockResolvedValue([] as never);
  vi.spyOn(dashboardRepository, 'sumOnAccountCredit').mockResolvedValue(0);
  vi.spyOn(dashboardRepository, 'findOpenInvoicesForAging').mockResolvedValue([] as never);
  vi.spyOn(dashboardRepository, 'findRecentDispatchEntries').mockResolvedValue([] as never);
  vi.spyOn(dashboardRepository, 'findRecentInvoices').mockResolvedValue([] as never);
  vi.spyOn(dashboardRepository, 'findRecentPayments').mockResolvedValue([] as never);
  vi.spyOn(dashboardRepository, 'findRecentPurchases').mockResolvedValue([] as never);
}

function istBoundaryIso(year: number, month0: number, day = 1): string {
  return new Date(Date.UTC(year, month0, day) - 5.5 * 60 * 60 * 1000).toISOString();
}

describe('DashboardService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('period range', () => {
    it('uses Settings.financialYearStart to compute the FY range', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-09T12:00:00.000Z'));
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue({
        id: 1,
        financialYearStart: 7,
      } as never);
      mockEmptyRepo();

      const result = await dashboardService.getDashboard('fy');

      expect(result.periodRange.start).toBe(istBoundaryIso(2026, 6));
      expect(result.periodRange.end).toBe(istBoundaryIso(2027, 6));
    });

    it('defaults financialYearStart to April when the Settings row is missing', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-09T12:00:00.000Z'));
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();

      const result = await dashboardService.getDashboard('fy');

      expect(result.periodRange.start).toBe(istBoundaryIso(2026, 3));
      expect(result.periodRange.end).toBe(istBoundaryIso(2027, 3));
    });
  });

  describe('revenue', () => {
    it('sums invoiced and collected totals separately', async () => {
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();
      vi.spyOn(dashboardRepository, 'findInvoicesInRange').mockResolvedValue([
        { date: new Date('2026-07-01'), totalAmount: 1000 },
        { date: new Date('2026-07-05'), totalAmount: 500 },
      ] as never);
      vi.spyOn(dashboardRepository, 'sumPaymentsInRange').mockResolvedValue(700);

      const result = await dashboardService.getDashboard('month');

      // findInvoicesInRange / sumPaymentsInRange return the same value for the current and
      // previous period here, so both change percentages are 0.
      expect(result.revenue).toEqual({
        invoiced: 1500,
        collected: 700,
        invoicedChangePct: 0,
        collectedChangePct: 0,
      });
    });

    it('computes period-over-period change vs the immediately preceding period', async () => {
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();
      // First call = current period, second call = previous period (same-length window).
      vi.spyOn(dashboardRepository, 'findInvoicesInRange')
        .mockResolvedValueOnce([{ date: new Date('2026-07-05'), totalAmount: 1200 }] as never)
        .mockResolvedValueOnce([{ date: new Date('2026-06-05'), totalAmount: 1000 }] as never);
      vi.spyOn(dashboardRepository, 'sumPaymentsInRange')
        .mockResolvedValueOnce(800)
        .mockResolvedValueOnce(500);

      const result = await dashboardService.getDashboard('month');

      expect(result.revenue.invoiced).toBe(1200);
      expect(result.revenue.collected).toBe(800);
      expect(result.revenue.invoicedChangePct).toBe(20); // (1200-1000)/1000
      expect(result.revenue.collectedChangePct).toBe(60); // (800-500)/500
    });

    it('returns null change when the previous period was zero', async () => {
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();
      vi.spyOn(dashboardRepository, 'findInvoicesInRange')
        .mockResolvedValueOnce([{ date: new Date('2026-07-05'), totalAmount: 1200 }] as never)
        .mockResolvedValueOnce([] as never);
      vi.spyOn(dashboardRepository, 'sumPaymentsInRange')
        .mockResolvedValueOnce(800)
        .mockResolvedValueOnce(0);

      const result = await dashboardService.getDashboard('month');

      expect(result.revenue.invoicedChangePct).toBeNull();
      expect(result.revenue.collectedChangePct).toBeNull();
    });
  });

  describe('onAccountCredit', () => {
    it('passes through the repository on-account total', async () => {
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();
      vi.spyOn(dashboardRepository, 'sumOnAccountCredit').mockResolvedValue(4200);

      const result = await dashboardService.getDashboard('month');

      expect(result.onAccountCredit).toBe(4200);
    });
  });

  describe('receivablesAging', () => {
    it('buckets open invoice balances by age, excludes settled/void, uses asOfDate for openings', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-15T00:00:00.000Z'));
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();
      vi.spyOn(dashboardRepository, 'findOpenInvoicesForAging').mockResolvedValue([
        // 5 days old, unpaid -> 0-30 (1000)
        { date: new Date('2026-07-10'), asOfDate: null, totalAmount: 1000, paymentAllocations: [] },
        // 44 days old, 500 paid of 2000 -> 31-60 (1500)
        {
          date: new Date('2026-06-01'),
          asOfDate: null,
          totalAmount: 2000,
          paymentAllocations: [{ amount: 500, payment: { status: 'ACTIVE' } }],
        },
        // fully paid -> excluded
        {
          date: new Date('2026-04-01'),
          asOfDate: null,
          totalAmount: 3000,
          paymentAllocations: [{ amount: 3000, payment: { status: 'ACTIVE' } }],
        },
        // 136 days old, allocation belongs to a VOID payment so balance stands -> 60+ (800)
        {
          date: new Date('2026-03-01'),
          asOfDate: null,
          totalAmount: 800,
          paymentAllocations: [{ amount: 200, payment: { status: 'VOID' } }],
        },
        // opening balance: asOfDate 1 day ago wins over old date -> 0-30 (400)
        {
          date: new Date('2026-01-01'),
          asOfDate: new Date('2026-07-14'),
          totalAmount: 400,
          paymentAllocations: [],
        },
      ] as never);

      const result = await dashboardService.getDashboard('month');

      expect(result.receivablesAging).toEqual({
        bucket0_30: 1400,
        bucket31_60: 1500,
        bucket60plus: 800,
        total: 3700,
      });
    });
  });

  describe('vendorPayables', () => {
    it('aggregates per vendor and excludes fully-paid purchases from the pending list', async () => {
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();
      vi.spyOn(dashboardRepository, 'findVendorPayables').mockResolvedValue([
        { vendorId: 'v1', vendorName: 'Vendor A', totalAmount: 1300, paidAmount: 200 },
        { vendorId: 'v2', vendorName: 'Vendor B', totalAmount: 500, paidAmount: 500 },
      ] as never);

      const result = await dashboardService.getDashboard('month');

      expect(result.vendorPayables.total).toBe(1100);
      expect(result.vendorPayables.topPendingVendors).toEqual([
        { vendorId: 'v1', vendorName: 'Vendor A', amountDue: 1100 },
      ]);
    });
  });

  describe('salesChart', () => {
    it('buckets an entry just after IST midnight into the correct IST day, not the earlier UTC day', async () => {
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();
      // 2026-07-09T19:00:00Z is 2026-07-10T00:30 IST -- one IST day later than its UTC date.
      vi.spyOn(dashboardRepository, 'findInvoicesInRange').mockResolvedValue([
        { date: new Date('2026-07-09T19:00:00.000Z'), totalAmount: 1000 },
      ] as never);

      const result = await dashboardService.getDashboard('month');

      expect(result.salesChart).toEqual([{ label: '2026-07-10', amount: 1000 }]);
    });

    it('buckets by IST month for period=fy and sums same-month invoices', async () => {
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();
      vi.spyOn(dashboardRepository, 'findInvoicesInRange').mockResolvedValue([
        { date: new Date('2026-07-01T10:00:00.000Z'), totalAmount: 1000 },
        { date: new Date('2026-07-20T10:00:00.000Z'), totalAmount: 500 },
        { date: new Date('2026-08-01T10:00:00.000Z'), totalAmount: 300 },
      ] as never);

      const result = await dashboardService.getDashboard('fy');

      expect(result.salesChart).toEqual([
        { label: '2026-07', amount: 1500 },
        { label: '2026-08', amount: 300 },
      ]);
    });
  });

  describe('topCategoryChart', () => {
    it('groups by category, sorts descending, and caps at 5', async () => {
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();
      const items = Array.from({ length: 6 }, (_, i) => ({
        categoryId: `cat-${i}`,
        categoryName: `Category ${i}`,
        amount: (i + 1) * 100,
      })).reverse();
      vi.spyOn(dashboardRepository, 'findTopCategorySalesInRange').mockResolvedValue(
        items as never
      );

      const result = await dashboardService.getDashboard('month');

      expect(result.topCategoryChart).toHaveLength(5);
      expect(result.topCategoryChart[0]).toEqual({
        categoryId: 'cat-5',
        categoryName: 'Category 5',
        amount: 600,
      });
    });
  });

  describe('lowStock', () => {
    it('flags products at or below their lower stock limit', async () => {
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();
      const inkCategory = { id: 'cat-ink', name: 'Ink' };
      vi.spyOn(dashboardRepository, 'findActiveProducts').mockResolvedValue([
        { id: 'p1', name: 'Ink Red', currentStock: 5, lowerStockLimit: 10, category: inkCategory },
        {
          id: 'p2',
          name: 'Ink Blue',
          currentStock: 20,
          lowerStockLimit: 10,
          category: inkCategory,
        },
        {
          id: 'p3',
          name: 'Ink Black',
          currentStock: 10,
          lowerStockLimit: 10,
          category: inkCategory,
        },
      ] as never);

      const result = await dashboardService.getDashboard('month');

      expect(result.lowStock).toEqual([
        {
          productId: 'p1',
          productName: 'Ink Red',
          currentStock: 5,
          lowerStockLimit: 10,
          categoryId: 'cat-ink',
          categoryName: 'Ink',
        },
        {
          productId: 'p3',
          productName: 'Ink Black',
          currentStock: 10,
          lowerStockLimit: 10,
          categoryId: 'cat-ink',
          categoryName: 'Ink',
        },
      ]);
    });
  });

  describe('creditHealth', () => {
    it('never flags creditLimit=0 as breached, but flags a real breach', async () => {
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();
      vi.spyOn(dashboardRepository, 'findAllCustomers').mockResolvedValue([
        { id: 'c1', firmName: 'Unconfigured Co', outstandingBalance: 50000, creditLimit: 0 },
        { id: 'c2', firmName: 'Over Limit Co', outstandingBalance: 150000, creditLimit: 100000 },
        { id: 'c3', firmName: 'Healthy Co', outstandingBalance: 5000, creditLimit: 100000 },
      ] as never);

      const result = await dashboardService.getDashboard('month');

      expect(result.creditHealth.totalOutstanding).toBe(205000);
      expect(result.creditHealth.breachedCustomers).toEqual([
        {
          customerId: 'c2',
          customerName: 'Over Limit Co',
          outstandingBalance: 150000,
          creditLimit: 100000,
        },
      ]);
    });
  });

  describe('recentActivity', () => {
    it('merges all sources, sorted by date descending', async () => {
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();
      vi.spyOn(dashboardRepository, 'findRecentDispatchEntries').mockResolvedValue([
        {
          id: 'd1',
          challanNo: 'CH-1',
          totalAmount: 100,
          date: new Date('2026-07-01'),
          customer: { firmName: 'Cust A' },
        },
      ] as never);
      vi.spyOn(dashboardRepository, 'findRecentInvoices').mockResolvedValue([
        {
          id: 'i1',
          invoiceNo: 'INV-1',
          totalAmount: 200,
          date: new Date('2026-07-03'),
          customer: { firmName: 'Cust B' },
        },
      ] as never);
      vi.spyOn(dashboardRepository, 'findRecentPayments').mockResolvedValue([
        { id: 'p1', amount: 300, date: new Date('2026-07-02'), customer: { firmName: 'Cust C' } },
      ] as never);
      vi.spyOn(dashboardRepository, 'findRecentPurchases').mockResolvedValue([
        {
          id: 'pu1',
          purchaseNo: 'PUR-1',
          totalAmount: 400,
          date: new Date('2026-06-30'),
          vendor: { name: 'Vendor X' },
        },
      ] as never);

      const result = await dashboardService.getDashboard('month');

      expect(result.recentActivity.map((a) => a.id)).toEqual(['i1', 'p1', 'd1', 'pu1']);
    });
  });

  describe('empty data', () => {
    it('returns empty arrays, never null, for every list field', async () => {
      vi.spyOn(dashboardRepository, 'findSettings').mockResolvedValue(null);
      mockEmptyRepo();

      const result = await dashboardService.getDashboard('month');

      expect(result.vendorPayables.topPendingVendors).toEqual([]);
      expect(result.salesChart).toEqual([]);
      expect(result.topCategoryChart).toEqual([]);
      expect(result.lowStock).toEqual([]);
      expect(result.creditHealth.breachedCustomers).toEqual([]);
      expect(result.recentActivity).toEqual([]);
      expect(result.onAccountCredit).toBe(0);
      expect(result.receivablesAging).toEqual({
        bucket0_30: 0,
        bucket31_60: 0,
        bucket60plus: 0,
        total: 0,
      });
    });
  });
});
