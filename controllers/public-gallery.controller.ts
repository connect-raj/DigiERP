import { NextRequest, NextResponse } from 'next/server';
import { galleryItemService } from '@/services/gallery-item.service';
import { verifyPublicApiKey } from '@/lib/api-key';
import { parsePagination } from '@/lib/pagination';

/** Public, read-only — safe to call from browser JS on the marketing site,
 * not just server-side, so it gets the same permissive CORS as ingestion. */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'x-api-key',
};

interface PublicGalleryItem {
  id: string;
  title: string;
  displayOrder: number;
  applicationType: string;
  image: {
    url: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    altText: string | null;
  };
  productLine: { id: string; name: string } | null;
}

function toPublicShape(item: {
  id: string;
  title: string;
  displayOrder: number;
  applicationType: { name: string };
  image: {
    url: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    altText: string | null;
  };
  relatedProductLine: { id: string; name: string } | null;
}): PublicGalleryItem {
  return {
    id: item.id,
    title: item.title,
    displayOrder: item.displayOrder,
    applicationType: item.applicationType.name,
    image: {
      url: item.image.url,
      mimeType: item.image.mimeType,
      width: item.image.width,
      height: item.image.height,
      altText: item.image.altText,
    },
    productLine: item.relatedProductLine,
  };
}

export class PublicGalleryController {
  async getAll(req: NextRequest) {
    await verifyPublicApiKey(req.headers.get('x-api-key'));

    const { searchParams } = new URL(req.url);
    const applicationTypeId = searchParams.get('applicationTypeId') ?? undefined;
    const productLineId = searchParams.get('productLineId') ?? undefined;
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await galleryItemService.getAll({
      applicationTypeId,
      relatedProductLineId: productLineId,
      isPublished: true,
      skip,
      take,
    });

    return NextResponse.json(
      {
        success: true,
        data: data.map(toPublicShape),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      { headers: CORS_HEADERS }
    );
  }
}

export const publicGalleryController = new PublicGalleryController();
