import { NextRequest } from 'next/server';
import { productService } from '@/services/product.service';
import { createProductSchema, updateProductSchema, adjustStockSchema } from '@/validations/product';
import { successResponse, BadRequestError } from '@/lib/errors';

export class ProductController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') ?? undefined;
    const search = searchParams.get('search') ?? undefined;
    const isActiveParam = searchParams.get('isActive');

    const isActive =
      isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

    const products = await productService.getAll({ categoryId, isActive, search });
    return successResponse(products);
  }

  async getById(_req: NextRequest, id: string) {
    const product = await productService.getById(id);
    return successResponse(product);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createProductSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const product = await productService.create(validated.data);
    return successResponse(product, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateProductSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const product = await productService.update(id, validated.data);
    return successResponse(product);
  }

  async delete(_req: NextRequest, id: string) {
    await productService.delete(id);
    return successResponse({ success: true });
  }

  async getStock(_req: NextRequest, id: string) {
    const stock = await productService.getStock(id);
    return successResponse(stock);
  }

  async adjustStock(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = adjustStockSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const result = await productService.adjustStock(id, validated.data);
    return successResponse(result);
  }
}

export const productController = new ProductController();
