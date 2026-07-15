import { customerRepository } from '@/repositories/customer.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';
import { CreateCustomerInput, UpdateCustomerInput } from '@/validations/customer';

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
}

export const customerService = new CustomerService();
