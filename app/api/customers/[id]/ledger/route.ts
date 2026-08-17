import { NextRequest } from 'next/server';
import { paymentController } from '@/controllers/payment.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return paymentController.getLedger(req, id);
  }
);
