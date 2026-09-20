import { NextRequest } from 'next/server';
import { colourService } from '@/services/colour.service';
import { createColourSchema, updateColourSchema } from '@/validations/colour';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';

export class ColourController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const isActiveParam = searchParams.get('isActive');
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await colourService.getAll({
      search,
      isActive: isActiveParam !== null ? isActiveParam === 'true' : undefined,
      skip,
      take,
    });
    return paginatedResponse(data, { page, limit, total });
  }

  async getById(_req: NextRequest, id: string) {
    const colour = await colourService.getById(id);
    return successResponse(colour);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createColourSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const colour = await colourService.create(validated.data);
    return successResponse(colour, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateColourSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const colour = await colourService.update(id, validated.data);
    return successResponse(colour);
  }

  async delete(_req: NextRequest, id: string) {
    await colourService.delete(id);
    return successResponse({ success: true });
  }
}

export const colourController = new ColourController();
