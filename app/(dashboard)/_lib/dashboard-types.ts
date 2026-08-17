export type DashboardPeriod = 'month' | 'fy';

export interface SalesChartPoint {
  label: string;
  amount: number;
}

export interface TopCategoryPoint {
  categoryId: string;
  categoryName: string;
  amount: number;
}

export interface PendingVendor {
  vendorId: string;
  vendorName: string;
  amountDue: number;
}

export interface LowStockProduct {
  productId: string;
  productName: string;
  currentStock: number;
  lowerStockLimit: number;
  categoryId: string;
  categoryName: string;
}

export interface BreachedCustomer {
  customerId: string;
  customerName: string;
  outstandingBalance: number;
  creditLimit: number;
}

export type ActivityType = 'dispatch' | 'invoice' | 'payment' | 'purchase';

export interface ActivityItem {
  type: ActivityType;
  id: string;
  label: string;
  amount: number;
  date: string;
}

export interface ReceivablesAging {
  bucket0_30: number;
  bucket31_60: number;
  bucket60plus: number;
  total: number;
}

export interface DashboardResponse {
  period: DashboardPeriod;
  periodRange: { start: string; end: string };
  revenue: {
    invoiced: number;
    collected: number;
    /** Percent change vs the immediately-preceding period; null when prior period was 0. */
    invoicedChangePct: number | null;
    collectedChangePct: number | null;
  };
  vendorPayables: { total: number; topPendingVendors: PendingVendor[] };
  /** Unallocated on-account credit across all customers (always-current balance). */
  onAccountCredit: number;
  receivablesAging: ReceivablesAging;
  salesChart: SalesChartPoint[];
  topCategoryChart: TopCategoryPoint[];
  lowStock: LowStockProduct[];
  creditHealth: { totalOutstanding: number; breachedCustomers: BreachedCustomer[] };
  recentActivity: ActivityItem[];
}
