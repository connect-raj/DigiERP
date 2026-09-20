import { Prisma } from '@prisma/client';
import { customerRepository } from '@/repositories/customer.repository';
import { productRepository } from '@/repositories/product.repository';
import { productLineRepository } from '@/repositories/product-line.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateCustomerLineInvoiceNameInput,
  UpdateCustomerLineInvoiceNameInput,
} from '@/validations/customer';

export class CustomerService {
  async getAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    return customerRepository.findAll(params);
  }

  async getById(id: string) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundError(`Customer with id '${id}' not found`);
    }
    return customer;
  }

  async create(data: CreateCustomerInput) {
    return customerRepository.create(data);
  }

  async update(id: string, data: UpdateCustomerInput) {
    await this.getById(id);
    return customerRepository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    if (await customerRepository.hasUnpaidInvoices(id)) {
      throw new BadRequestError(
        'Cannot deactivate a customer with unpaid invoices',
        'CUSTOMER_HAS_UNPAID_INVOICES'
      );
    }
    if (await customerRepository.hasOpenDispatch(id)) {
      throw new BadRequestError(
        'Cannot deactivate a customer with dispatch entries awaiting billing',
        'CUSTOMER_HAS_OPEN_DISPATCH'
      );
    }

    await customerRepository.softDelete(id);
  }

  async getPrices(id: string) {
    await this.getById(id);
    return customerRepository.findPricesByCustomerId(id);
  }

  async getPriceHistory(id: string, productId?: string) {
    await this.getById(id);
    return customerRepository.findPriceHistoryByCustomerId(id, productId);
  }

  async setManualPrice(customerId: string, productId: string, price: number) {
    await this.getById(customerId);

    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError(`Product with id '${productId}' not found`);
    }

    return customerRepository.setManualPrice(customerId, productId, price);
  }

  async getLineInvoiceNames(id: string) {
    await this.getById(id);
    return customerRepository.findLineInvoiceNamesByCustomerId(id);
  }

  async createLineInvoiceName(customerId: string, data: CreateCustomerLineInvoiceNameInput) {
    await this.getById(customerId);

    const line = await productLineRepository.findById(data.lineId);
    if (!line) {
      throw new NotFoundError(`Product line with id '${data.lineId}' not found`);
    }
    if (!line.isActive) {
      throw new BadRequestError(`Product line '${line.name}' is not active`);
    }

    try {
      return await customerRepository.createLineInvoiceName(customerId, data);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestError(
          'An invoice name for this product line already exists for this customer — edit the existing entry instead.',
          'CUSTOMER_LINE_INVOICE_NAME_ALREADY_EXISTS'
        );
      }
      throw error;
    }
  }

  async updateLineInvoiceName(
    customerId: string,
    id: string,
    data: UpdateCustomerLineInvoiceNameInput
  ) {
    await this.getById(customerId);
    await this.getLineInvoiceNameForCustomer(customerId, id);
    return customerRepository.updateLineInvoiceName(id, data);
  }

  async deleteLineInvoiceName(customerId: string, id: string): Promise<void> {
    await this.getById(customerId);
    await this.getLineInvoiceNameForCustomer(customerId, id);
    await customerRepository.deleteLineInvoiceName(id);
  }

  private async getLineInvoiceNameForCustomer(customerId: string, id: string) {
    const existing = await customerRepository.findLineInvoiceNameById(id);
    if (!existing || existing.customerId !== customerId) {
      throw new NotFoundError(`Invoice name with id '${id}' not found for this customer`);
    }
    return existing;
  }
}

export const customerService = new CustomerService();
