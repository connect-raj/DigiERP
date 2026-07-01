import prisma from '@/lib/prisma';
import { CreateVendorInput, UpdateVendorInput } from '@/validations/vendor';

export class VendorRepository {
  async findAll(params: { isActive?: boolean; search?: string }) {
    const { isActive, search } = params;
    return prisma.vendor.findMany({
      where: {
        ...(isActive !== undefined && { isActive }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        _count: { select: { vendorProducts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.vendor.findUnique({
      where: { id },
      include: {
        vendorProducts: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    });
  }

  async create(data: CreateVendorInput) {
    return prisma.vendor.create({ data });
  }

  async update(id: string, data: UpdateVendorInput) {
    return prisma.vendor.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.vendor.update({ where: { id }, data: { isActive: false } });
  }

  async hasPurchases(_id: string): Promise<boolean> {
    // No Purchase model yet — always false
    return false;
  }

  async linkProducts(
    vendorId: string,
    products: Array<{ productId: string; isPreferred?: boolean }>
  ): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const preferredProducts = products.filter((p) => p.isPreferred === true);

      // If any of the incoming products are preferred, clear existing preferred flag for this vendor
      if (preferredProducts.length > 0) {
        await tx.vendorProduct.updateMany({
          where: { vendorId, isPreferred: true },
          data: { isPreferred: false },
        });
      }

      let count = 0;
      for (const product of products) {
        await tx.vendorProduct.upsert({
          where: { vendorId_productId: { vendorId, productId: product.productId } },
          create: {
            vendorId,
            productId: product.productId,
            isPreferred: product.isPreferred ?? false,
          },
          update: {
            isPreferred: product.isPreferred ?? false,
          },
        });
        count++;
      }

      return count;
    });
  }

  async unlinkProduct(vendorId: string, productId: string): Promise<void> {
    await prisma.vendorProduct.delete({
      where: { vendorId_productId: { vendorId, productId } },
    });
  }
}

export const vendorRepository = new VendorRepository();
