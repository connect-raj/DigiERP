import { NextRequest } from 'next/server';
import { galleryItemController } from '@/controllers/gallery-item.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => galleryItemController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => galleryItemController.create(req));
