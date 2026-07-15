import { NextRequest } from 'next/server';
import { settingsController } from '@/controllers/settings.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler(() => settingsController.get());

export const PUT = asyncHandler((req: NextRequest) => settingsController.update(req));
