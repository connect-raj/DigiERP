import prisma from '@/lib/prisma';
import { PeriodRange } from '@/lib/period';

export class DashboardRepository {
  async findSettings() {
    return prisma.settings.findFirst();
  }

  async findInvoicesInRange(range: PeriodRange) {
    return prisma.invoice.findMany({
      where: { date: { gte: range.start, lt: range.end } },
      select: { date: true, totalAmount: true },
    });
  }

  async sumPaymentsInRange(range: PeriodRange) {
    const result = await prisma.payment.aggregate({
      where: { date: { gte: range.start, lt: range.end } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  // isCancelled purchases don't represent a real payable, so they're excluded here.
  async findVendorPayablesInRange(range: PeriodRange) {
    const grouped = await prisma.purchase.groupBy({
      by: ['vendorId'],
      where: {
        date: { gte: range.start, lt: range.end },
        isCancelled: false,
      },
      _sum: { totalAmount: true, paidAmount: true },
    });

    if (grouped.length === 0) return [];

    const vendors = await prisma.vendor.findMany({
      where: { id: { in: grouped.map((g) => g.vendorId) } },
      select: { id: true, name: true },
    });
    const vendorNameById = new Map(vendors.map((v) => [v.id, v.name]));

    return grouped.map((g) => ({
      vendorId: g.vendorId,
      vendorName: vendorNameById.get(g.vendorId) ?? g.vendorId,
      totalAmount: Number(g._sum.totalAmount ?? 0),
      paidAmount: Number(g._sum.paidAmount ?? 0),
    }));
  }

  async findTopCategorySalesInRange(range: PeriodRange) {
    const grouped = await prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: { invoice: { date: { gte: range.start, lt: range.end } } },
      _sum: { lineTotal: true },
    });

    if (grouped.length === 0) return [];

    const products = await prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, category: { select: { id: true, name: true } } },
    });
    const categoryByProductId = new Map(products.map((p) => [p.id, p.category]));

    const byCategory = new Map<string, { categoryId: string; categoryName: string; amount: number }>();
    for (const g of grouped) {
      const category = categoryByProductId.get(g.productId);
      if (!category) continue;
      const amount = Number(g._sum.lineTotal ?? 0);
      const existing = byCategory.get(category.id);
      if (existing) {
        existing.amount += amount;
      } else {
        byCategory.set(category.id, { categoryId: category.id, categoryName: category.name, amount });
      }
    }

    return [...byCategory.values()].sort((a, b) => b.amount - a.amount);
  }

  async findActiveProducts() {
    return prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        currentStock: true,
        lowerStockLimit: true,
        category: { select: { id: true, name: true } },
      },
    });
  }

  // Deliberately unfiltered by isActive -- a deactivated customer's debt is still real.
  async findAllCustomers() {
    return prisma.customer.findMany({
      select: { id: true, firmName: true, outstandingBalance: true, creditLimit: true },
    });
  }

  async findRecentDispatchEntries(limit: number) {
    return prisma.dispatchEntry.findMany({
      where: { isCancelled: false },
      select: {
        id: true,
        challanNo: true,
        totalAmount: true,
        date: true,
        customer: { select: { firmName: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async findRecentInvoices(limit: number) {
    return prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNo: true,
        totalAmount: true,
        date: true,
        customer: { select: { firmName: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async findRecentPayments(limit: number) {
    return prisma.payment.findMany({
      select: {
        id: true,
        amount: true,
        date: true,
        customer: { select: { firmName: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async findRecentPurchases(limit: number) {
    return prisma.purchase.findMany({
      where: { isCancelled: false },
      select: {
        id: true,
        purchaseNo: true,
        totalAmount: true,
        date: true,
        vendor: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }
}

export const dashboardRepository = new DashboardRepository();
