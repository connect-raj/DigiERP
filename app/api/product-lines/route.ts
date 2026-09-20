import { NextRequest } from 'next/server';
import { productLineController } from '@/controllers/product-line.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => productLineController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => productLineController.create(req));
