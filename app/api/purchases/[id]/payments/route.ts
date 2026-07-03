import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '@/lib/asyncHandler';
import { successResponse, NotFoundError, BadRequestError } from '@/lib/errors';

const paymentSchema = z.object({
  amount: z.number().positive(),
  mode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER']),
  date: z.string().datetime(),
  reference: z.string().optional(),
});

export const GET = asyncHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const purchase = await prisma.purchase.findUnique({
      where: { id: id },
    });

    if (!purchase) {
      throw new NotFoundError('Purchase not found');
    }

    const payments = await prisma.vendorPayment.findMany({
      where: { purchaseId: id },
      include: {
        recordedBy: {
          select: { id: true, username: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return successResponse(payments);
  }
);

export const POST = asyncHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('Invalid request body');
    }

    const data = parsed.data;

    const purchase = await prisma.purchase.findUnique({
      where: { id: id },
    });

    if (!purchase) {
      throw new NotFoundError('Purchase not found');
    }

    if (purchase.isCancelled) {
      throw new BadRequestError('PURCHASE_IS_CANCELLED');
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const currentPurchase = await tx.purchase.findUnique({
        where: { id: purchase.id },
      });

      const amount = Number(data.amount);
      const paidAmount = Number(currentPurchase!.paidAmount);
      const totalAmount = Number(currentPurchase!.totalAmount);

      if (paidAmount + amount > totalAmount) {
        throw new BadRequestError('PAYMENT_EXCEEDS_TOTAL');
      }

      const payment = await tx.vendorPayment.create({
        data: {
          vendorId: purchase.vendorId,
          purchaseId: purchase.id,
          amount,
          mode: data.mode,
          reference: data.reference,
          date: new Date(data.date),
        },
      });

      const newPaidAmount = paidAmount + amount;
      let paymentStatus = 'UNPAID';
      if (newPaidAmount >= totalAmount) {
        paymentStatus = 'PAID';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'PARTIAL';
      }

      const updatedPurchase = await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: paymentStatus as PaymentStatus,
        },
        select: {
          paidAmount: true,
          paymentStatus: true,
        },
      });

      return {
        payment,
        purchase: updatedPurchase,
      };
    });

    return successResponse(result, 201);
  }
);
