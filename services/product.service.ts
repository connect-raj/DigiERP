import { productRepository } from '@/repositories/product.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';
import { CreateProductInput, UpdateProductInput, AdjustStockInput } from '@/validations/product';

export class ProductService {
  async getAll(params: { categoryId?: string; isActive?: boolean; search?: string }) {
    return productRepository.findAll(params);
  }

  async getById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with id '${id}' not found`);
    }
    return product;
  }

  async create(data: CreateProductInput) {
    return productRepository.create(data);
  }

  async update(id: string, data: UpdateProductInput) {
    await this.getById(id);
    return productRepository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    const product = await this.getById(id);

    if (Number(product.currentStock) > 0) {
      throw new BadRequestError('Cannot delete product with existing stock', 'PRODUCT_HAS_STOCK');
    }

    const hasOpenChallans = await productRepository.hasOpenChallans(id);
    if (hasOpenChallans) {
      throw new BadRequestError(
        'Cannot delete product with open challans',
        'PRODUCT_HAS_OPEN_CHALLANS'
      );
    }

    await productRepository.softDelete(id);
  }

  async getStock(id: string) {
    await this.getById(id);
    return productRepository.getStock(id);
  }

  async adjustStock(id: string, input: AdjustStockInput) {
    const product = await this.getById(id);
    const newStock = Number(product.currentStock) + input.quantity;

    if (newStock < 0) {
      throw new BadRequestError(
        `Insufficient stock. Current: ${product.currentStock}, Requested: ${input.quantity}`,
        'INSUFFICIENT_STOCK'
      );
    }

    return productRepository.adjustStock(id, input.quantity, input.reason as string);
  }
}

export const productService = new ProductService();
