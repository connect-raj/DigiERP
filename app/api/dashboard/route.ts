import { NextRequest } from 'next/server';
import { dashboardController } from '@/controllers/dashboard.controller';
import { asyncHandler } from '@/lib/asyncHandler';

export const GET = asyncHandler((req: NextRequest) => dashboardController.getDashboard(req));
