import { NextRequest } from 'next/server';
import { galleryApplicationTypeService } from '@/services/gallery-application-type.service';
import {
  createGalleryApplicationTypeSchema,
  updateGalleryApplicationTypeSchema,
} from '@/validations/gallery-application-type';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';

export class GalleryApplicationTypeController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await galleryApplicationTypeService.getAll({ search, skip, take });
    return paginatedResponse(data, { page, limit, total });
  }

  async getById(_req: NextRequest, id: string) {
    const type = await galleryApplicationTypeService.getById(id);
    return successResponse(type);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createGalleryApplicationTypeSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const type = await galleryApplicationTypeService.create(validated.data);
    return successResponse(type, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateGalleryApplicationTypeSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const type = await galleryApplicationTypeService.update(id, validated.data);
    return successResponse(type);
  }

  async delete(_req: NextRequest, id: string) {
    await galleryApplicationTypeService.delete(id);
    return successResponse({ success: true });
  }
}

export const galleryApplicationTypeController = new GalleryApplicationTypeController();
