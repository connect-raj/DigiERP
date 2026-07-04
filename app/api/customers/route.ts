import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { asyncHandler } from '@/lib/asyncHandler';
import { successResponse } from '@/lib/errors';

export const GET = asyncHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';

  const customers = await prisma.customer.findMany({
    where: search
      ? {
          firmName: {
            contains: search,
            mode: 'insensitive',
          },
        }
      : {},
    orderBy: {
      firmName: 'asc',
    },
  });

  return successResponse(customers);
});
