import { NextRequest } from 'next/server';
import { taxClassService } from '@/services/tax-class.service';
import { createTaxClassSchema, updateTaxClassSchema } from '@/validations/tax-class';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';

export class TaxClassController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const isActiveParam = searchParams.get('isActive');
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await taxClassService.getAll({
      search,
      isActive: isActiveParam !== null ? isActiveParam === 'true' : undefined,
      skip,
      take,
    });
    return paginatedResponse(data, { page, limit, total });
  }

  async getById(_req: NextRequest, id: string) {
    const taxClass = await taxClassService.getById(id);
    return successResponse(taxClass);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createTaxClassSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const taxClass = await taxClassService.create(validated.data);
    return successResponse(taxClass, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateTaxClassSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const taxClass = await taxClassService.update(id, validated.data);
    return successResponse(taxClass);
  }

  async delete(_req: NextRequest, id: string) {
    await taxClassService.delete(id);
    return successResponse({ success: true });
  }
}

export const taxClassController = new TaxClassController();
