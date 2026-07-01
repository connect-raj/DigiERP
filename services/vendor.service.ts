import { vendorRepository } from '@/repositories/vendor.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';
import {
  CreateVendorInput,
  UpdateVendorInput,
  LinkVendorProductsInput,
} from '@/validations/vendor';

export class VendorService {
  async getAll(params: { isActive?: boolean; search?: string }) {
    return vendorRepository.findAll(params);
  }

  async getById(id: string) {
    const vendor = await vendorRepository.findById(id);
    if (!vendor) {
      throw new NotFoundError(`Vendor with id '${id}' not found`);
    }
    return vendor;
  }

  async create(data: CreateVendorInput) {
    return vendorRepository.create(data);
  }

  async update(id: string, data: UpdateVendorInput) {
    await this.getById(id);
    return vendorRepository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    const hasPurchases = await vendorRepository.hasPurchases(id);
    if (hasPurchases) {
      throw new BadRequestError(
        'Cannot delete vendor with existing purchases',
        'VENDOR_HAS_PURCHASES'
      );
    }
    await vendorRepository.softDelete(id);
  }

  async linkProducts(id: string, data: LinkVendorProductsInput): Promise<number> {
    await this.getById(id);
    return vendorRepository.linkProducts(id, data.products);
  }

  async unlinkProduct(vendorId: string, productId: string): Promise<void> {
    await vendorRepository.unlinkProduct(vendorId, productId);
  }
}

export const vendorService = new VendorService();
