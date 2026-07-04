import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { asyncHandler } from '@/lib/asyncHandler';
import { successResponse } from '@/lib/errors';

export const GET = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const prices = await prisma.customerPrice.findMany({
      where: { customerId: id },
      include: {
        product: true,
      },
    });
    return successResponse(prices);
  }
);
