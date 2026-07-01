import { NextRequest } from 'next/server'; // NextRequest used in create and update
import { categoryService } from '@/services/category.service';
import { createCategorySchema, updateCategorySchema } from '@/validations/category';
import { successResponse, BadRequestError } from '@/lib/errors';

export class CategoryController {
  async getAll() {
    const categories = await categoryService.getAll();
    return successResponse(categories);
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
