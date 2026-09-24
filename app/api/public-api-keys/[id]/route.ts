import { NextRequest } from 'next/server';
import { publicApiKeyController } from '@/controllers/public-api-key.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const PATCH = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return publicApiKeyController.update(req, id);
  }
);
