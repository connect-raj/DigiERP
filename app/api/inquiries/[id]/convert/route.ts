import { NextRequest } from 'next/server';
import { inquiryController } from '@/controllers/inquiry.controller';
import { asyncHandler } from '@/lib/asyncHandler';

/** GET previews the phone-match warning without creating anything; POST
 * executes the conversion. */
export const GET = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return inquiryController.previewConvert(req, id);
  }
);

export const POST = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return inquiryController.convert(req, id);
  }
);
