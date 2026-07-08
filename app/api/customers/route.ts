import { NextRequest } from 'next/server';
import { customerController } from '@/controllers/customer.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => customerController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => customerController.create(req));
