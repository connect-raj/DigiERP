import { NextRequest } from 'next/server';
import { vendorController } from '@/controllers/vendor.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const POST = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return vendorController.linkProducts(req, id);
  }
);
