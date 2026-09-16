import { NextRequest } from 'next/server';
import { ingestionApiKeyController } from '@/controllers/ingestion-api-key.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const PATCH = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return ingestionApiKeyController.update(req, id);
  }
);
