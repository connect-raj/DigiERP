import { NextRequest } from 'next/server';
import { ProductKind } from '@prisma/client';
import { productLineService } from '@/services/product-line.service';
import { createProductLineSchema, updateProductLineSchema } from '@/validations/product-line';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';

export class ProductLineController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const kindParam = searchParams.get('kind');
    const isActiveParam = searchParams.get('isActive');
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await productLineService.getAll({
      search,
      kind: kindParam ? (kindParam as ProductKind) : undefined,
      isActive: isActiveParam !== null ? isActiveParam === 'true' : undefined,
      skip,
      take,
    });
    return paginatedResponse(data, { page, limit, total });
  }

  async getById(_req: NextRequest, id: string) {
    const productLine = await productLineService.getById(id);
    return successResponse(productLine);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createProductLineSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const productLine = await productLineService.create(validated.data);
    return successResponse(productLine, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateProductLineSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const productLine = await productLineService.update(id, validated.data);
    return successResponse(productLine);
  }

  async delete(_req: NextRequest, id: string) {
    await productLineService.delete(id);
    return successResponse({ success: true });
  }
}

export const productLineController = new ProductLineController();
