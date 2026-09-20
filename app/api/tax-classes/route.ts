import { NextRequest } from 'next/server';
import { taxClassController } from '@/controllers/tax-class.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => taxClassController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => taxClassController.create(req));
