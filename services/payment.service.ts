import { PaymentMode } from '@prisma/client';
import { paymentRepository, PaymentFilters } from '@/repositories/payment.repository';
import { NotFoundError } from '@/lib/errors';
import { CreatePaymentInput, AllocatePaymentsInput } from '@/validations/payment';

export class PaymentService {
  async getAll(filters: PaymentFilters) {
    return paymentRepository.findAll(filters);
  }

  async getById(id: string) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundError(`Payment with id '${id}' not found`);
    }
    return payment;
  }

  async getByCustomerId(customerId: string) {
    const customer = await paymentRepository.findCustomerById(customerId);
    if (!customer) {
      throw new NotFoundError(`Customer with id '${customerId}' not found`);
    }
    return paymentRepository.findByCustomerId(customerId);
  }

  async getAllocationsByInvoiceId(invoiceId: string) {
    const invoice = await paymentRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundError(`Invoice with id '${invoiceId}' not found`);
    }
    return paymentRepository.findAllocationsByInvoiceId(invoiceId);
  }

  async create(data: CreatePaymentInput, recordedById?: string) {
    const customer = await paymentRepository.findCustomerById(data.customerId);
    if (!customer) {
      throw new NotFoundError(`Customer with id '${data.customerId}' not found`);
    }

    return paymentRepository.createPaymentTx({
      customerId: data.customerId,
      amount: data.amount,
      mode: data.mode as PaymentMode,
      date: new Date(data.date),
      reference: data.reference,
      recordedById,
    });
  }

  async allocate(data: AllocatePaymentsInput) {
    return paymentRepository.allocateBatch(data);
  }
}

export const paymentService = new PaymentService();
