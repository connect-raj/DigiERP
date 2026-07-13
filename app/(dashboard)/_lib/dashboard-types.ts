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

export interface DashboardResponse {
  period: DashboardPeriod;
  periodRange: { start: string; end: string };
  revenue: { invoiced: number; collected: number };
  vendorPayables: { total: number; topPendingVendors: PendingVendor[] };
  salesChart: SalesChartPoint[];
  topCategoryChart: TopCategoryPoint[];
  lowStock: LowStockProduct[];
  creditHealth: { totalOutstanding: number; breachedCustomers: BreachedCustomer[] };
  recentActivity: ActivityItem[];
}
