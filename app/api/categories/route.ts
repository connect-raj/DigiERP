import { NextRequest } from 'next/server';
import { categoryController } from '@/controllers/category.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler(() => categoryController.getAll());

export const POST = asyncHandler((req: NextRequest) => categoryController.create(req));
