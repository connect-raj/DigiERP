import { NextRequest } from 'next/server';
import { categoryService } from '@/services/category.service';
import { createCategorySchema, updateCategorySchema } from '@/validations/category';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';

export class CategoryController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total, avgGstRate } = await categoryService.getAll({ search, skip, take });
    return paginatedResponse(data, { page, limit, total }, { summary: { total, avgGstRate } });
  }

  async getById(id: string) {
    const category = await categoryService.getById(id);
    return successResponse(category);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createCategorySchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const category = await categoryService.create(validated.data);
    return successResponse(category, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateCategorySchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const category = await categoryService.update(id, validated.data);
    return successResponse(category);
  }
}

export const categoryController = new CategoryController();
