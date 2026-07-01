import { authController } from '@/controllers/auth.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const POST = asyncHandler(() => authController.logout());
