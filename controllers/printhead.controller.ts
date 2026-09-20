import { NextRequest } from 'next/server';
import { printheadService } from '@/services/printhead.service';
import { createPrintheadSchema, updatePrintheadSchema } from '@/validations/printhead';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';

export class PrintheadController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const isActiveParam = searchParams.get('isActive');
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await printheadService.getAll({
      search,
      isActive: isActiveParam !== null ? isActiveParam === 'true' : undefined,
      skip,
      take,
    });
    return paginatedResponse(data, { page, limit, total });
  }

  async getById(_req: NextRequest, id: string) {
    const printhead = await printheadService.getById(id);
    return successResponse(printhead);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createPrintheadSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const printhead = await printheadService.create(validated.data);
    return successResponse(printhead, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updatePrintheadSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const printhead = await printheadService.update(id, validated.data);
    return successResponse(printhead);
  }

  async delete(_req: NextRequest, id: string) {
    await printheadService.delete(id);
    return successResponse({ success: true });
  }
}

export const printheadController = new PrintheadController();
