import { NextRequest } from 'next/server';
import { userController } from '@/controllers/user.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => userController.getAllUsers(req));
