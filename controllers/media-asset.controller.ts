import { NextRequest } from 'next/server';
import { mediaAssetService } from '@/services/media-asset.service';
import { updateMediaAssetSchema } from '@/validations/media-asset';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';

export class MediaAssetController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await mediaAssetService.getAll({ search, skip, take });
    return paginatedResponse(data, { page, limit, total });
  }

  async getById(_req: NextRequest, id: string) {
    const asset = await mediaAssetService.getById(id);
    return successResponse(asset);
  }

  async upload(req: NextRequest) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      throw new BadRequestError('Expected multipart/form-data');
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new BadRequestError("Missing 'file' field");
    }
    const altTextRaw = formData.get('altText');
    const altText = typeof altTextRaw === 'string' && altTextRaw.length > 0 ? altTextRaw : null;

    const asset = await mediaAssetService.upload(file, altText);
    return successResponse(asset, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateMediaAssetSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const asset = await mediaAssetService.update(id, validated.data);
    return successResponse(asset);
  }

  async delete(_req: NextRequest, id: string) {
    await mediaAssetService.delete(id);
    return successResponse({ success: true });
  }
}

export const mediaAssetController = new MediaAssetController();
