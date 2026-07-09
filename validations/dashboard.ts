import { z } from 'zod';

export const periodSchema = z.enum(['month', 'fy']);

export type DashboardPeriod = z.infer<typeof periodSchema>;
