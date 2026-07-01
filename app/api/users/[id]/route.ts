import { NextRequest } from 'next/server';
import { userController } from '@/controllers/user.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    return userController.getUserById(req, id);
  }
);

export const PATCH = asyncHandler(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    return userController.updateUser(req, id);
  }
);

export const DELETE = asyncHandler(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    return userController.deleteUser(req, id);
  }
);
