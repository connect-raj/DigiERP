import { NextRequest } from 'next/server';
import { paymentController } from '@/controllers/payment.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const POST = asyncHandler((req: NextRequest) => paymentController.allocate(req));
