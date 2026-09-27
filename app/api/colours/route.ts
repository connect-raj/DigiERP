import { NextRequest } from 'next/server';
import { colourController } from '@/controllers/colour.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => colourController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => colourController.create(req));
