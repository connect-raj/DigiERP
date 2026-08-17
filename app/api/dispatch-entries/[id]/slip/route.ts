import { NextRequest } from 'next/server';
import { dispatchEntryController } from '@/controllers/dispatch-entry.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return dispatchEntryController.getSlipPdf(req, id);
  }
);
