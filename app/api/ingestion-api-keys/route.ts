import { NextRequest } from 'next/server';
import { ingestionApiKeyController } from '@/controllers/ingestion-api-key.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => ingestionApiKeyController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => ingestionApiKeyController.create(req));
