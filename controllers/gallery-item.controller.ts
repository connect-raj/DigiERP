import { NextRequest } from 'next/server';
import { galleryItemService } from '@/services/gallery-item.service';
import { createGalleryItemSchema, updateGalleryItemSchema } from '@/validations/gallery-item';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';

export class GalleryItemController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const applicationTypeId = searchParams.get('applicationTypeId') ?? undefined;
    const relatedProductLineId = searchParams.get('relatedProductLineId') ?? undefined;
    const isPublishedParam = searchParams.get('isPublished');
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await galleryItemService.getAll({
      search,
      applicationTypeId,
      relatedProductLineId,
      isPublished: isPublishedParam !== null ? isPublishedParam === 'true' : undefined,
      skip,
      take,
    });
    return paginatedResponse(data, { page, limit, total });
  }

  async getById(_req: NextRequest, id: string) {
    const item = await galleryItemService.getById(id);
    return successResponse(item);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createGalleryItemSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const item = await galleryItemService.create(validated.data);
    return successResponse(item, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateGalleryItemSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const item = await galleryItemService.update(id, validated.data);
    return successResponse(item);
  }

  async delete(_req: NextRequest, id: string) {
    await galleryItemService.delete(id);
    return successResponse({ success: true });
  }
}

export const galleryItemController = new GalleryItemController();
