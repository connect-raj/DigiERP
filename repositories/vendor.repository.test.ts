import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vendorRepository } from './vendor.repository';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    vendor: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    vendorProduct: {
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
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
};

describe('VendorRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findAll', () => {
    beforeEach(() => {
      vi.mocked(prisma.vendor.count).mockResolvedValue(0);
    });

    it('should return vendors with _count and total', async () => {
      const vendors = [{ ...mockVendor, _count: { vendorProducts: 3 } }];
      vi.mocked(prisma.vendor.findMany).mockResolvedValue(vendors as never);
      vi.mocked(prisma.vendor.count).mockResolvedValue(1);
      const result = await vendorRepository.findAll({});
      expect(prisma.vendor.findMany).toHaveBeenCalled();
      expect(result).toEqual({ data: vendors, total: 1 });
    });

    it('should filter by isActive', async () => {
      vi.mocked(prisma.vendor.findMany).mockResolvedValue([]);
      await vendorRepository.findAll({ isActive: true });
      expect(prisma.vendor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: true }) })
      );
    });

    it('should apply search filter', async () => {
      vi.mocked(prisma.vendor.findMany).mockResolvedValue([]);
      await vendorRepository.findAll({ search: 'test' });
      expect(prisma.vendor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) })
      );
    });

    it('should apply skip/take for pagination', async () => {
      vi.mocked(prisma.vendor.findMany).mockResolvedValue([]);
      await vendorRepository.findAll({ skip: 10, take: 10 });
      expect(prisma.vendor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });
  });

  describe('findById', () => {
    it('should return a vendor with nested products', async () => {
      vi.mocked(prisma.vendor.findUnique).mockResolvedValue(mockVendor as never);
      const result = await vendorRepository.findById('vendor-id-1');
      expect(prisma.vendor.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'vendor-id-1' } })
      );
      expect(result).toEqual(mockVendor);
    });

    it('should return null when not found', async () => {
      vi.mocked(prisma.vendor.findUnique).mockResolvedValue(null);
      const result = await vendorRepository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a vendor', async () => {
      vi.mocked(prisma.vendor.create).mockResolvedValue(mockVendor as never);
      const input = {
        name: 'Test Vendor',
        phone: '9876543210',
        address: '123 Test Street',
        state: 'Maharashtra',
      };
      const result = await vendorRepository.create(input);
      expect(prisma.vendor.create).toHaveBeenCalledWith({ data: input });
      expect(result).toEqual(mockVendor);
    });
  });

  describe('update', () => {
    it('should update a vendor', async () => {
      const updated = { ...mockVendor, name: 'Updated Vendor' };
      vi.mocked(prisma.vendor.update).mockResolvedValue(updated as never);
      const result = await vendorRepository.update('vendor-id-1', { name: 'Updated Vendor' });
      expect(prisma.vendor.update).toHaveBeenCalledWith({
        where: { id: 'vendor-id-1' },
        data: { name: 'Updated Vendor' },
      });
      expect(result.name).toBe('Updated Vendor');
    });
  });

  describe('softDelete', () => {
    it('should set isActive to false', async () => {
      vi.mocked(prisma.vendor.update).mockResolvedValue({
        ...mockVendor,
        isActive: false,
      } as never);
      await vendorRepository.softDelete('vendor-id-1');
      expect(prisma.vendor.update).toHaveBeenCalledWith({
        where: { id: 'vendor-id-1' },
        data: { isActive: false },
      });
    });
  });

  describe('hasPurchases', () => {
    it('should return false (stub — no Purchase model yet)', async () => {
      const result = await vendorRepository.hasPurchases('vendor-id-1');
      expect(result).toBe(false);
    });
  });

  describe('linkProducts', () => {
    it('should call $transaction and return count', async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue(2 as never);
      const result = await vendorRepository.linkProducts('vendor-id-1', [
        { productId: 'prod-1', isPreferred: true },
        { productId: 'prod-2' },
      ]);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toBe(2);
    });
  });

  describe('unlinkProduct', () => {
    it('should delete the VendorProduct row', async () => {
      vi.mocked(prisma.vendorProduct.delete).mockResolvedValue({} as never);
      await vendorRepository.unlinkProduct('vendor-id-1', 'prod-1');
      expect(prisma.vendorProduct.delete).toHaveBeenCalledWith({
        where: { vendorId_productId: { vendorId: 'vendor-id-1', productId: 'prod-1' } },
      });
    });
  });
});
