import { NextRequest } from 'next/server';
import { authController } from '@/controllers/auth.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const POST = asyncHandler((req: NextRequest) => authController.login(req));
