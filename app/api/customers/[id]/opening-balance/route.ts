import { NextRequest } from 'next/server';
import { invoiceController } from '@/controllers/invoice.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const PATCH = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return invoiceController.setOpeningBalance(req, id);
  }
);
