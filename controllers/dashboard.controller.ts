import { NextRequest } from 'next/server';
import { dashboardService } from '@/services/dashboard.service';
import { periodSchema, DashboardPeriod } from '@/validations/dashboard';
import { successResponse, BadRequestError } from '@/lib/errors';

export class DashboardController {
  async getDashboard(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const periodParam = searchParams.get('period');

    let period: DashboardPeriod = 'month';
    if (periodParam !== null) {
      const validated = periodSchema.safeParse(periodParam);
      if (!validated.success) {
        throw new BadRequestError("Invalid period: must be 'month' or 'fy'", 'INVALID_PERIOD');
      }
      period = validated.data;
    }

    const dashboard = await dashboardService.getDashboard(period);
    return successResponse(dashboard);
  }
}

export const dashboardController = new DashboardController();
