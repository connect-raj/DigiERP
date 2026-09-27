import { NextRequest } from 'next/server';
import { colourSetService } from '@/services/colour-set.service';
import { createColourSetSchema, updateColourSetSchema } from '@/validations/colour-set';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';

export class ColourSetController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const isActiveParam = searchParams.get('isActive');
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await colourSetService.getAll({
      search,
      isActive: isActiveParam !== null ? isActiveParam === 'true' : undefined,
      skip,
      take,
    });
    return paginatedResponse(data, { page, limit, total });
  }

  async getById(_req: NextRequest, id: string) {
    const colourSet = await colourSetService.getById(id);
    return successResponse(colourSet);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createColourSetSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const colourSet = await colourSetService.create(validated.data);
    return successResponse(colourSet, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateColourSetSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const colourSet = await colourSetService.update(id, validated.data);
    return successResponse(colourSet);
  }

  async delete(_req: NextRequest, id: string) {
    await colourSetService.delete(id);
    return successResponse({ success: true });
  }
}

export const colourSetController = new ColourSetController();
