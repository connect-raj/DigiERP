import { NextRequest } from 'next/server';
import { inquiryController } from '@/controllers/inquiry.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => inquiryController.getAll(req));
