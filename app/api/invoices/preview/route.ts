import { NextRequest } from 'next/server';
import { invoiceController } from '@/controllers/invoice.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => invoiceController.getPreview(req));
