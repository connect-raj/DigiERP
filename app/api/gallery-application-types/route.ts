import { NextRequest } from 'next/server';
import { galleryApplicationTypeController } from '@/controllers/gallery-application-type.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => galleryApplicationTypeController.getAll(req));

export const POST = asyncHandler((req: NextRequest) =>
  galleryApplicationTypeController.create(req)
);
