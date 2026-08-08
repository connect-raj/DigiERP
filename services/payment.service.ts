import { PaymentMode } from '@prisma/client';
import { paymentRepository, PaymentFilters } from '@/repositories/payment.repository';
import { NotFoundError } from '@/lib/errors';
import { getPaymentOnAccount } from '@/lib/balance';
import {
  CreatePaymentInput,
  UpdateAllocationsInput,
  AllocationLineInput,
} from '@/validations/payment';

function toAllocations(lines: AllocationLineInput[]) {
  return lines.map((a) => ({
    invoiceId: a.invoiceId ?? null,
    amount: a.amount,
    note: a.note,
  }));
}

export class PaymentService {
  async getAll(filters: PaymentFilters) {
    return paymentRepository.findAll(filters);
  }

  async getSummary(filters: PaymentFilters) {
    const rows = await paymentRepository.findStatsRows(filters);

    let totalReceived = 0;
    let totalUnallocated = 0;
    for (const row of rows) {
      totalReceived += Number(row.amount);
      totalUnallocated += getPaymentOnAccount(row.amount, row.allocations);
    }

    return {
      totalReceived,
      totalAllocated: totalReceived - totalUnallocated,
      totalUnallocated,
      count: rows.length,
    };
  }

  async getById(id: string) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundError(`Payment with id '${id}' not found`);
    }
    return payment;
  }

  async getByCustomerId(customerId: string) {
    await this.assertCustomer(customerId);
    return paymentRepository.findByCustomerId(customerId);
  }

  async getAllocationsByInvoiceId(invoiceId: string) {
    const invoice = await paymentRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundError(`Invoice with id '${invoiceId}' not found`);
    }
    return paymentRepository.findAllocationsByInvoiceId(invoiceId);
  }

  async getLedger(customerId: string) {
    await this.assertCustomer(customerId);
    return paymentRepository.findLedger(customerId);
  }

  async getOpenInvoices(customerId: string) {
    await this.assertCustomer(customerId);
    return paymentRepository.findOpenInvoices(customerId);
  }

  async create(data: CreatePaymentInput, recordedById?: string) {
    await this.assertCustomer(data.customerId);
    return paymentRepository.createPaymentWithAllocations({
      customerId: data.customerId,
      amount: data.amount,
      mode: data.mode as PaymentMode,
      date: new Date(data.date),
      reference: data.reference,
      allocations: toAllocations(data.allocations ?? []),
      recordedById,
    });
  }

  async updateAllocations(paymentId: string, data: UpdateAllocationsInput) {
    return paymentRepository.updateAllocations(paymentId, toAllocations(data.allocations));
  }

  async voidPayment(paymentId: string) {
    return paymentRepository.voidPayment(paymentId);
  }

  private async assertCustomer(customerId: string) {
    const customer = await paymentRepository.findCustomerById(customerId);
    if (!customer) {
      throw new NotFoundError(`Customer with id '${customerId}' not found`);
    }
    return customer;
  }
}

export const paymentService = new PaymentService();
