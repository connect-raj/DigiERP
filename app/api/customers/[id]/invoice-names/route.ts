import { NextRequest } from 'next/server';
import { customerController } from '@/controllers/customer.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return customerController.getLineInvoiceNames(req, id);
  }
);

export const POST = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return customerController.createLineInvoiceName(req, id);
  }
);
