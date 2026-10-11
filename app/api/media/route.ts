import { NextRequest } from 'next/server';
import { mediaAssetController } from '@/controllers/media-asset.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => mediaAssetController.getAll(req));

/** Accepts multipart/form-data (a 'file' field, optional 'altText'), not JSON
 * — this is a file upload, not a metadata-only create. */
export const POST = asyncHandler((req: NextRequest) => mediaAssetController.upload(req));
