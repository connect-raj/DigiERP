import { NextRequest } from 'next/server';
import { lineRoleService } from '@/services/line-role.service';
import { createLineRoleSchema, updateLineRoleSchema } from '@/validations/line-role';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';

export class LineRoleController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const isActiveParam = searchParams.get('isActive');
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await lineRoleService.getAll({
      search,
      isActive: isActiveParam !== null ? isActiveParam === 'true' : undefined,
      skip,
      take,
    });
    return paginatedResponse(data, { page, limit, total });
  }

  async getById(_req: NextRequest, id: string) {
    const lineRole = await lineRoleService.getById(id);
    return successResponse(lineRole);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createLineRoleSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const lineRole = await lineRoleService.create(validated.data);
    return successResponse(lineRole, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateLineRoleSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const lineRole = await lineRoleService.update(id, validated.data);
    return successResponse(lineRole);
  }

  async delete(_req: NextRequest, id: string) {
    await lineRoleService.delete(id);
    return successResponse({ success: true });
  }
}

export const lineRoleController = new LineRoleController();
