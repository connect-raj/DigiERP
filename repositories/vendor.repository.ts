import prisma from '@/lib/prisma';
import { CreateVendorInput, UpdateVendorInput } from '@/validations/vendor';

export class VendorRepository {
  async findAll(params: { isActive?: boolean; search?: string; skip?: number; take?: number }) {
    const { isActive, search, skip, take } = params;
    const where = {
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          _count: { select: { vendorProducts: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.vendor.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.vendor.findUnique({
      where: { id },
      include: {
        vendorProducts: {
          select: {
            id: true,
            productId: true,
            isPreferred: true,
            product: {
              select: { id: true, name: true, category: { select: { name: true } } },
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

  async hasPurchases(id: string): Promise<boolean> {
    const count = await prisma.purchase.count({ where: { vendorId: id } });
    return count > 0;
  }

  async linkProducts(
    vendorId: string,
    products: Array<{ productId: string; isPreferred?: boolean }>
  ): Promise<number> {
    return prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
      const preferredProducts = products.filter((p) => p.isPreferred === true);

      // If any of the incoming products are preferred, clear existing preferred flag for this vendor
      if (preferredProducts.length > 0) {
        await tx.vendorProduct.updateMany({
          where: { vendorId, isPreferred: true },
          data: { isPreferred: false },
        });
      }

      await Promise.all(
        products.map((product) =>
          tx.vendorProduct.upsert({
            where: { vendorId_productId: { vendorId, productId: product.productId } },
            create: {
              vendorId,
              productId: product.productId,
              isPreferred: product.isPreferred ?? false,
            },
            update: {
              isPreferred: product.isPreferred ?? false,
            },
          })
        )
      );

      return products.length;
    });
  }

  async unlinkProduct(vendorId: string, productId: string): Promise<void> {
    await prisma.vendorProduct.delete({
      where: { vendorId_productId: { vendorId, productId } },
    });
  }
}

export const vendorRepository = new VendorRepository();
