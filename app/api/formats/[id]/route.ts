import { NextRequest } from 'next/server';
import { formatController } from '@/controllers/format.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return formatController.getById(req, id);
  }
);

export const PUT = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return formatController.update(req, id);
  }
);

export const DELETE = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return formatController.delete(req, id);
  }
);
