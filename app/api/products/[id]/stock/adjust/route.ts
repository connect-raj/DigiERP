import { NextRequest } from 'next/server';
import { productController } from '@/controllers/product.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const POST = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return productController.adjustStock(req, id);
  }
);
