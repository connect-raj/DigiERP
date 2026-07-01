import { NextRequest } from 'next/server';
import { vendorController } from '@/controllers/vendor.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const DELETE = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string; productId: string }> }) => {
    const { id, productId } = await params;
    return vendorController.unlinkProduct(req, id, productId);
  }
);
