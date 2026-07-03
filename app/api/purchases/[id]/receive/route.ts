import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { asyncHandler } from '@/lib/asyncHandler';
import { successResponse, NotFoundError, BadRequestError } from '@/lib/errors';
import { z } from 'zod';

const receiveSchema = z.object({
  receivedDate: z.string().datetime(),
});

export const PATCH = asyncHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json();

    const parsed = receiveSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('Invalid request body');
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id },
    });

    if (!purchase) {
      throw new NotFoundError('Purchase not found');
    }

    if (purchase.isCancelled) {
      throw new BadRequestError('Cannot receive a cancelled purchase');
    }

    const updatedPurchase = await prisma.purchase.update({
      where: { id },
      data: {
        receivedDate: new Date(parsed.data.receivedDate),
      },
    });

    return successResponse(updatedPurchase);
  }
);
