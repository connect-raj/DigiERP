import { NextRequest } from 'next/server';
import { vendorController } from '@/controllers/vendor.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => vendorController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => vendorController.create(req));
