import { NextRequest } from 'next/server';
import { customerController } from '@/controllers/customer.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const PUT = asyncHandler(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string; productId: string }> }
  ) => {
    const { id, productId } = await params;
    return customerController.setPrice(req, id, productId);
  }
);
