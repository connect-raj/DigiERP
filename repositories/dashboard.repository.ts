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

  async findPaymentsInRange(range: PeriodRange) {
    return prisma.payment.findMany({
      where: { date: { gte: range.start, lt: range.end } },
      select: { amount: true },
    });
  }

  // isCancelled purchases don't represent a real payable, so they're excluded here.
  async findPurchasesInRange(range: PeriodRange) {
    return prisma.purchase.findMany({
      where: {
        date: { gte: range.start, lt: range.end },
        isCancelled: false,
      },
      select: {
        totalAmount: true,
        paidAmount: true,
        vendor: { select: { id: true, name: true } },
      },
    });
  }

  async findInvoiceItemsInRange(range: PeriodRange) {
    return prisma.invoiceItem.findMany({
      where: { invoice: { date: { gte: range.start, lt: range.end } } },
      select: {
        lineTotal: true,
        product: { select: { category: { select: { id: true, name: true } } } },
      },
    });
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
