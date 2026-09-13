import { NextRequest, NextResponse } from 'next/server';
import { asyncHandler } from '@/lib/asyncHandler';
import {
  inquiryIngestionController,
  CORS_HEADERS,
} from '@/controllers/inquiry-ingestion.controller';

export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS_HEADERS });

const handlePost = asyncHandler((req: NextRequest) => inquiryIngestionController.create(req));

export const POST = async (req: NextRequest) => {
  const res = await handlePost(req);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.headers.set(key, value));
  return res;
};
