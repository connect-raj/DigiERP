import { dashboardRepository } from '@/repositories/dashboard.repository';
import { getPeriodRange, getIstDateParts, Period } from '@/lib/period';

const TOP_PENDING_VENDORS_LIMIT = 5;
const TOP_CATEGORY_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 15;

type InvoiceRow = Awaited<ReturnType<typeof dashboardRepository.findInvoicesInRange>>[number];
type VendorPayableRow = Awaited<
  ReturnType<typeof dashboardRepository.findVendorPayablesInRange>
>[number];
type ProductRow = Awaited<ReturnType<typeof dashboardRepository.findActiveProducts>>[number];
type CustomerRow = Awaited<ReturnType<typeof dashboardRepository.findAllCustomers>>[number];

type ActivityType = 'dispatch' | 'invoice' | 'payment' | 'purchase';

interface ActivityItem {
  type: ActivityType;
  id: string;
  label: string;
  amount: number;
  date: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export class DashboardService {
  async getDashboard(period: Period) {
    const settings = await dashboardRepository.findSettings();
    const financialYearStartMonth = settings?.financialYearStart ?? 4;
    const range = getPeriodRange(period, new Date(), financialYearStartMonth);

    const [
      invoices,
      collected,
      vendorPayables,
      topCategorySales,
      products,
      customers,
      recentActivity,
    ] = await Promise.all([
      dashboardRepository.findInvoicesInRange(range),
      dashboardRepository.sumPaymentsInRange(range),
      dashboardRepository.findVendorPayablesInRange(range),
      dashboardRepository.findTopCategorySalesInRange(range),
      dashboardRepository.findActiveProducts(),
      dashboardRepository.findAllCustomers(),
      this.getRecentActivity(),
    ]);

    return {
      period,
      periodRange: { start: range.start.toISOString(), end: range.end.toISOString() },
      revenue: this.buildRevenue(invoices, collected),
      vendorPayables: this.buildVendorPayables(vendorPayables),
      salesChart: this.buildSalesChart(period, invoices),
      topCategoryChart: topCategorySales.slice(0, TOP_CATEGORY_LIMIT),
      lowStock: this.buildLowStock(products),
      creditHealth: this.buildCreditHealth(customers),
      recentActivity,
    };
  }

  private buildRevenue(invoices: InvoiceRow[], collected: number) {
    return {
      invoiced: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0),
      collected,
    };
  }

  private buildVendorPayables(vendorPayables: VendorPayableRow[]) {
    let total = 0;
    const withAmountDue = vendorPayables.map((v) => {
      const amountDue = v.totalAmount - v.paidAmount;
      total += amountDue;
      return { vendorId: v.vendorId, vendorName: v.vendorName, amountDue };
    });

    const topPendingVendors = withAmountDue
      .filter((vendor) => vendor.amountDue > 0)
      .sort((a, b) => b.amountDue - a.amountDue)
      .slice(0, TOP_PENDING_VENDORS_LIMIT);

    return { total, topPendingVendors };
  }

  private buildSalesChart(period: Period, invoices: InvoiceRow[]) {
    const buckets = new Map<string, number>();

    for (const invoice of invoices) {
      const { year, month, day } = getIstDateParts(invoice.date);
      const label =
        period === 'month' ? `${year}-${pad(month + 1)}-${pad(day)}` : `${year}-${pad(month + 1)}`;
      buckets.set(label, (buckets.get(label) ?? 0) + Number(invoice.totalAmount));
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([label, amount]) => ({ label, amount }));
  }

  private buildLowStock(products: ProductRow[]) {
    return products
      .filter((product) => Number(product.currentStock) <= Number(product.lowerStockLimit))
      .map((product) => ({
        productId: product.id,
        productName: product.name,
        currentStock: Number(product.currentStock),
        lowerStockLimit: Number(product.lowerStockLimit),
        categoryId: product.category.id,
        categoryName: product.category.name,
      }));
  }

  private buildCreditHealth(customers: CustomerRow[]) {
    let totalOutstanding = 0;
    const breachedCustomers: {
      customerId: string;
      customerName: string;
      outstandingBalance: number;
      creditLimit: number;
    }[] = [];

    for (const customer of customers) {
      const outstandingBalance = Number(customer.outstandingBalance);
      const creditLimit = Number(customer.creditLimit);
      totalOutstanding += outstandingBalance;

      // creditLimit === 0 means "not yet configured", never a breach.
      if (creditLimit > 0 && outstandingBalance > creditLimit) {
        breachedCustomers.push({
          customerId: customer.id,
          customerName: customer.firmName,
          outstandingBalance,
          creditLimit,
        });
      }
    }

    breachedCustomers.sort(
      (a, b) => b.outstandingBalance - b.creditLimit - (a.outstandingBalance - a.creditLimit)
    );

    return { totalOutstanding, breachedCustomers };
  }

  private async getRecentActivity(): Promise<ActivityItem[]> {
    const [dispatchEntries, invoices, payments, purchases] = await Promise.all([
      dashboardRepository.findRecentDispatchEntries(RECENT_ACTIVITY_LIMIT),
      dashboardRepository.findRecentInvoices(RECENT_ACTIVITY_LIMIT),
      dashboardRepository.findRecentPayments(RECENT_ACTIVITY_LIMIT),
      dashboardRepository.findRecentPurchases(RECENT_ACTIVITY_LIMIT),
    ]);

    const items: ActivityItem[] = [
      ...dispatchEntries.map((entry) => ({
        type: 'dispatch' as const,
        id: entry.id,
        label: `Dispatch ${entry.challanNo} to ${entry.customer.firmName}`,
        amount: Number(entry.totalAmount),
        date: entry.date.toISOString(),
      })),
      ...invoices.map((invoice) => ({
        type: 'invoice' as const,
        id: invoice.id,
        label: `Invoice ${invoice.invoiceNo} to ${invoice.customer.firmName}`,
        amount: Number(invoice.totalAmount),
        date: invoice.date.toISOString(),
      })),
      ...payments.map((payment) => ({
        type: 'payment' as const,
        id: payment.id,
        label: `Payment received from ${payment.customer.firmName}`,
        amount: Number(payment.amount),
        date: payment.date.toISOString(),
      })),
      ...purchases.map((purchase) => ({
        type: 'purchase' as const,
        id: purchase.id,
        label: `Purchase ${purchase.purchaseNo} from ${purchase.vendor.name}`,
        amount: Number(purchase.totalAmount),
        date: purchase.date.toISOString(),
      })),
    ];

    return items.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, RECENT_ACTIVITY_LIMIT);
  }
}

export const dashboardService = new DashboardService();
