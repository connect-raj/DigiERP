import { describe, it, expect, vi, beforeEach } from 'vitest';
import { customerService } from './customer.service';
import { customerRepository } from '@/repositories/customer.repository';
import { productRepository } from '@/repositories/product.repository';
import { NotFoundError } from '@/lib/errors';

vi.mock('@/repositories/customer.repository', () => ({
  customerRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    hasUnpaidInvoices: vi.fn(),
    hasOpenDispatch: vi.fn(),
    findPricesByCustomerId: vi.fn(),
    setManualPrice: vi.fn(),
  },
}));

vi.mock('@/repositories/product.repository', () => ({
  productRepository: {
    findById: vi.fn(),
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

  describe('delete', () => {
    it('throws NotFoundError when the customer does not exist', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(null);
      await expect(customerService.delete('missing')).rejects.toThrow(NotFoundError);
    });

    it('blocks deactivation when the customer has unpaid invoices', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(customer as never);
      vi.spyOn(customerRepository, 'hasUnpaidInvoices').mockResolvedValue(true);
      const softDeleteSpy = vi.spyOn(customerRepository, 'softDelete');

      await expect(customerService.delete('cust-1')).rejects.toThrow(
        expect.objectContaining({ code: 'CUSTOMER_HAS_UNPAID_INVOICES' })
      );
      expect(softDeleteSpy).not.toHaveBeenCalled();
    });

    it('blocks deactivation when the customer has dispatch entries awaiting billing', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(customer as never);
      vi.spyOn(customerRepository, 'hasUnpaidInvoices').mockResolvedValue(false);
      vi.spyOn(customerRepository, 'hasOpenDispatch').mockResolvedValue(true);
      const softDeleteSpy = vi.spyOn(customerRepository, 'softDelete');

      await expect(customerService.delete('cust-1')).rejects.toThrow(
        expect.objectContaining({ code: 'CUSTOMER_HAS_OPEN_DISPATCH' })
      );
      expect(softDeleteSpy).not.toHaveBeenCalled();
    });

    it('soft-deletes a customer with no unpaid invoices or open dispatch', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(customer as never);
      vi.spyOn(customerRepository, 'hasUnpaidInvoices').mockResolvedValue(false);
      vi.spyOn(customerRepository, 'hasOpenDispatch').mockResolvedValue(false);
      vi.spyOn(customerRepository, 'softDelete').mockResolvedValue({
        ...customer,
        isActive: false,
      } as never);

      await customerService.delete('cust-1');
      expect(customerRepository.softDelete).toHaveBeenCalledWith('cust-1');
    });
  });

  describe('setManualPrice', () => {
    it('throws NotFoundError when the customer does not exist', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(null);
      await expect(customerService.setManualPrice('missing', 'prod-1', 100)).rejects.toThrow(
        NotFoundError
      );
    });

    it('throws NotFoundError when the product does not exist', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(customer as never);
      vi.spyOn(productRepository, 'findById').mockResolvedValue(null);
      await expect(customerService.setManualPrice('cust-1', 'missing', 100)).rejects.toThrow(
        NotFoundError
      );
    });

    it('sets a manual price when both customer and product exist', async () => {
      vi.spyOn(customerRepository, 'findById').mockResolvedValue(customer as never);
      vi.spyOn(productRepository, 'findById').mockResolvedValue({ id: 'prod-1' } as never);
      vi.spyOn(customerRepository, 'setManualPrice').mockResolvedValue({
        id: 'cp-1',
        customerId: 'cust-1',
        productId: 'prod-1',
        price: 100,
        isManual: true,
      } as never);

      const result = await customerService.setManualPrice('cust-1', 'prod-1', 100);
      expect(customerRepository.setManualPrice).toHaveBeenCalledWith('cust-1', 'prod-1', 100);
      expect(result.isManual).toBe(true);
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
