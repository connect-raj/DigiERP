import { NextRequest } from 'next/server';
import { dispatchEntryController } from '@/controllers/dispatch-entry.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => dispatchEntryController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => dispatchEntryController.create(req));
