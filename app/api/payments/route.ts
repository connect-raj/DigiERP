import { NextRequest } from 'next/server';
import { paymentController } from '@/controllers/payment.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => paymentController.getAll(req));

export const POST = asyncHandler((req: NextRequest) => paymentController.create(req));
