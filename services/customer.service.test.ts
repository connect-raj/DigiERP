import { describe, it, expect, vi, beforeEach } from 'vitest';
import { customerService } from './customer.service';
import { customerRepository } from '@/repositories/customer.repository';
import { NotFoundError } from '@/lib/errors';

vi.mock('@/repositories/customer.repository', () => ({
  customerRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findPricesByCustomerId: vi.fn(),
  },
}));

const customer = {
  id: 'cust-1',
  firmName: 'Test Firm',
  state: 'Gujarat',
  gstin: null,
  outstandingBalance: 0,
  creditLimit: 100000,
};

describe('CustomerService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getById', () => {
    it('throws NotFoundError when the customer does not exist', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(null);
      await expect(customerService.getById('missing')).rejects.toThrow(NotFoundError);
    });

    it('returns the customer when found', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(customer as never);
      await expect(customerService.getById('cust-1')).resolves.toEqual(customer);
    });
  });

  describe('update', () => {
    it('throws NotFoundError before attempting an update on a missing customer', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(null);
      const updateSpy = vi.spyOn(customerRepository, 'update');

      await expect(customerService.update('missing', { firmName: 'New Name' })).rejects.toThrow(
        NotFoundError
      );
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('updates an existing customer', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(customer as never);
      vi.spyOn(customerRepository, 'update').mockResolvedValue({
        ...customer,
        firmName: 'New Name',
      } as never);

      const result = await customerService.update('cust-1', { firmName: 'New Name' });
      expect(result.firmName).toBe('New Name');
      expect(customerRepository.update).toHaveBeenCalledWith('cust-1', { firmName: 'New Name' });
    });
  });

  describe('getPrices', () => {
    it('throws NotFoundError when the customer does not exist', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(null);
      await expect(customerService.getPrices('missing')).rejects.toThrow(NotFoundError);
    });

    it('returns customer prices when the customer exists', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(customer as never);
      vi.spyOn(customerRepository, 'findPricesByCustomerId').mockResolvedValue([] as never);

      await expect(customerService.getPrices('cust-1')).resolves.toEqual([]);
    });
  });
});
