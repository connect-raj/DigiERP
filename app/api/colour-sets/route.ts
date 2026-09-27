import { NextRequest } from 'next/server';
import { colourSetController } from '@/controllers/colour-set.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => colourSetController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => colourSetController.create(req));
