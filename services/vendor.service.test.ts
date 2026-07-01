import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vendorService } from './vendor.service';
import { vendorRepository } from '@/repositories/vendor.repository';
import { NotFoundError } from '@/lib/errors';

vi.mock('@/repositories/vendor.repository', () => ({
  vendorRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    hasPurchases: vi.fn(),
    linkProducts: vi.fn(),
    unlinkProduct: vi.fn(),
  },
}));

const mockVendor = {
  id: 'vendor-id-1',
  name: 'Test Vendor',
  email: 'vendor@test.com',
  phone: '9876543210',
  address: '123 Test Street',
  state: 'Maharashtra',
  gstin: null,
  paymentTerms: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  vendorProducts: [],
};

describe('VendorService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAll', () => {
    it('should return all vendors', async () => {
      vi.spyOn(vendorRepository, 'findAll').mockResolvedValue([mockVendor as never]);
      const result = await vendorService.getAll({});
      expect(vendorRepository.findAll).toHaveBeenCalledWith({});
      expect(result).toHaveLength(1);
    });

    it('should pass filter params to repository', async () => {
      vi.spyOn(vendorRepository, 'findAll').mockResolvedValue([]);
      await vendorService.getAll({ isActive: true, search: 'test' });
      expect(vendorRepository.findAll).toHaveBeenCalledWith({ isActive: true, search: 'test' });
    });
  });

  describe('getById', () => {
    it('should return a vendor when found', async () => {
      vi.spyOn(vendorRepository, 'findById').mockResolvedValue(mockVendor as never);
      const result = await vendorService.getById('vendor-id-1');
      expect(result).toEqual(mockVendor);
    });

    it('should throw NotFoundError when vendor does not exist', async () => {
      vi.spyOn(vendorRepository, 'findById').mockResolvedValue(null);
      await expect(vendorService.getById('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create and return a vendor', async () => {
      vi.spyOn(vendorRepository, 'create').mockResolvedValue(mockVendor as never);
      const input = {
        name: 'Test Vendor',
        phone: '9876543210',
        address: '123 Test Street',
        state: 'Maharashtra',
      };
      const result = await vendorService.create(input);
      expect(vendorRepository.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockVendor);
    });
  });

  describe('update', () => {
    it('should update a vendor when found', async () => {
      const updated = { ...mockVendor, name: 'Updated Vendor' };
      vi.spyOn(vendorRepository, 'findById').mockResolvedValue(mockVendor as never);
      vi.spyOn(vendorRepository, 'update').mockResolvedValue(updated as never);
      const result = await vendorService.update('vendor-id-1', { name: 'Updated Vendor' });
      expect(result.name).toBe('Updated Vendor');
    });

    it('should throw NotFoundError if vendor does not exist', async () => {
      vi.spyOn(vendorRepository, 'findById').mockResolvedValue(null);
      await expect(vendorService.update('bad-id', { name: 'X' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should soft-delete a vendor with no purchases', async () => {
      vi.spyOn(vendorRepository, 'findById').mockResolvedValue(mockVendor as never);
      vi.spyOn(vendorRepository, 'hasPurchases').mockResolvedValue(false);
      vi.spyOn(vendorRepository, 'softDelete').mockResolvedValue(mockVendor as never);
      await vendorService.delete('vendor-id-1');
      expect(vendorRepository.softDelete).toHaveBeenCalledWith('vendor-id-1');
    });

    it('should throw NotFoundError if vendor does not exist', async () => {
      vi.spyOn(vendorRepository, 'findById').mockResolvedValue(null);
      await expect(vendorService.delete('bad-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError with VENDOR_HAS_PURCHASES code if purchases exist', async () => {
      vi.spyOn(vendorRepository, 'findById').mockResolvedValue(mockVendor as never);
      vi.spyOn(vendorRepository, 'hasPurchases').mockResolvedValue(true);
      await expect(vendorService.delete('vendor-id-1')).rejects.toThrow(
        expect.objectContaining({ code: 'VENDOR_HAS_PURCHASES' })
      );
    });
  });

  describe('linkProducts', () => {
    it('should link products to a vendor', async () => {
      vi.spyOn(vendorRepository, 'findById').mockResolvedValue(mockVendor as never);
      vi.spyOn(vendorRepository, 'linkProducts').mockResolvedValue(2);
      const result = await vendorService.linkProducts('vendor-id-1', {
        products: [
          { productId: '00000000-0000-0000-0000-000000000001', isPreferred: true },
          { productId: '00000000-0000-0000-0000-000000000002' },
        ],
      });
      expect(result).toBe(2);
    });

    it('should throw NotFoundError if vendor does not exist', async () => {
      vi.spyOn(vendorRepository, 'findById').mockResolvedValue(null);
      await expect(
        vendorService.linkProducts('bad-id', {
          products: [{ productId: '00000000-0000-0000-0000-000000000001' }],
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('unlinkProduct', () => {
    it('should unlink a product from a vendor', async () => {
      vi.spyOn(vendorRepository, 'unlinkProduct').mockResolvedValue(undefined);
      await vendorService.unlinkProduct('vendor-id-1', 'product-id-1');
      expect(vendorRepository.unlinkProduct).toHaveBeenCalledWith('vendor-id-1', 'product-id-1');
    });
  });
});
