import { customerRepository } from '@/repositories/customer.repository';
import { NotFoundError } from '@/lib/errors';
import { CreateCustomerInput, UpdateCustomerInput } from '@/validations/customer';

export class CustomerService {
  async getAll(search?: string) {
    return customerRepository.findAll(search);
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

  async getPrices(id: string) {
    await this.getById(id);
    return customerRepository.findPricesByCustomerId(id);
  }
}

export const customerService = new CustomerService();
