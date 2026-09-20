import { NextRequest } from 'next/server';
import { brandController } from '@/controllers/brand.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => brandController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => brandController.create(req));
