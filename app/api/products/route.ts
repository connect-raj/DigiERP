import { NextRequest } from 'next/server';
import { productController } from '@/controllers/product.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => productController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => productController.create(req));
