import { NextRequest } from 'next/server';
import { brandService } from '@/services/brand.service';
import { createBrandSchema, updateBrandSchema } from '@/validations/brand';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';

export class BrandController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const isActiveParam = searchParams.get('isActive');
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await brandService.getAll({
      search,
      isActive: isActiveParam !== null ? isActiveParam === 'true' : undefined,
      skip,
      take,
    });
    return paginatedResponse(data, { page, limit, total });
  }

  async getById(_req: NextRequest, id: string) {
    const brand = await brandService.getById(id);
    return successResponse(brand);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createBrandSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const brand = await brandService.create(validated.data);
    return successResponse(brand, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateBrandSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const brand = await brandService.update(id, validated.data);
    return successResponse(brand);
  }

  async delete(_req: NextRequest, id: string) {
    await brandService.delete(id);
    return successResponse({ success: true });
  }
}

export const brandController = new BrandController();
