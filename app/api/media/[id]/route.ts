import { NextRequest } from 'next/server';
import { mediaAssetController } from '@/controllers/media-asset.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return mediaAssetController.getById(req, id);
  }
);

export const PATCH = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return mediaAssetController.update(req, id);
  }
);

export const DELETE = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return mediaAssetController.delete(req, id);
  }
);
