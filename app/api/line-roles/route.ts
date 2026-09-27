import { NextRequest } from 'next/server';
import { lineRoleController } from '@/controllers/line-role.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => lineRoleController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => lineRoleController.create(req));
