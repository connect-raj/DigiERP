import { NextRequest } from 'next/server';
import { inquiryController } from '@/controllers/inquiry.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return inquiryController.getById(req, id);
  }
);

export const PATCH = asyncHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return inquiryController.updateStatus(req, id);
  }
);
