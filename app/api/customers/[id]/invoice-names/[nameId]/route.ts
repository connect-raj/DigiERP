import { NextRequest } from 'next/server';
import { customerController } from '@/controllers/customer.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const PUT = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string; nameId: string }> }) => {
    const { id, nameId } = await params;
    return customerController.updateLineInvoiceName(req, id, nameId);
  }
);

export const DELETE = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string; nameId: string }> }) => {
    const { id, nameId } = await params;
    return customerController.deleteLineInvoiceName(req, id, nameId);
  }
);
