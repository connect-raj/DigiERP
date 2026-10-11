import { NextRequest, NextResponse } from 'next/server';
import { asyncHandler } from '@/lib/asyncHandler';
import { publicGalleryController, CORS_HEADERS } from '@/controllers/public-gallery.controller';

export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS_HEADERS });

export const GET = asyncHandler((req: NextRequest) => publicGalleryController.getAll(req));
