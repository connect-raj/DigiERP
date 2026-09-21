import { NextRequest } from 'next/server';
import { printheadController } from '@/controllers/printhead.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => printheadController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => printheadController.create(req));
