import { NextRequest } from 'next/server';
import { technologyController } from '@/controllers/technology.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => technologyController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => technologyController.create(req));
