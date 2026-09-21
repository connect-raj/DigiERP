import { NextRequest } from 'next/server';
import { unitController } from '@/controllers/unit.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => unitController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => unitController.create(req));
