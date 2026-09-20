import { NextRequest } from 'next/server';
import { formatController } from '@/controllers/format.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => formatController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => formatController.create(req));
