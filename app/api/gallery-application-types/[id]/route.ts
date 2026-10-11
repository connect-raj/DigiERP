import { NextRequest } from 'next/server';
import { galleryApplicationTypeController } from '@/controllers/gallery-application-type.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return galleryApplicationTypeController.getById(req, id);
  }
);

export const PUT = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return galleryApplicationTypeController.update(req, id);
  }
);

export const PATCH = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return galleryApplicationTypeController.update(req, id);
  }
);

export const DELETE = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return galleryApplicationTypeController.delete(req, id);
  }
);
