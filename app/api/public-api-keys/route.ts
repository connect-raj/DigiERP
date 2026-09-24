import { NextRequest } from 'next/server';
import { publicApiKeyController } from '@/controllers/public-api-key.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => publicApiKeyController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => publicApiKeyController.create(req));
