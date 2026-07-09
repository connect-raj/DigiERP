'use client';

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { DashboardPeriod, SalesChartPoint } from '../../_lib/dashboard-types';

interface SalesChartProps {
  data: SalesChartPoint[];
  period: DashboardPeriod;
}

const LINE_COLOR = '#adc6ff';
const GRID_COLOR = '#333333';
const AXIS_COLOR = '#8e9192';
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatTick(label: string, period: DashboardPeriod) {
  if (period === 'month') {
    return label.slice(-2);
  }
  const month = Number(label.split('-')[1]);
  return MONTH_NAMES[month - 1] ?? label;
}

function formatCompactInr(value: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function SalesTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  if (typeof value !== 'number') return null;

  return (
    <div className="bg-surface-container-high border-outline-variant rounded-md border-[0.5px] px-3 py-2 shadow-lg">
      <p className="text-on-surface-variant mb-1 text-[11px]">{label}</p>
      <div className="flex items-center gap-2">
        <span className="h-[2px] w-3 shrink-0" style={{ backgroundColor: LINE_COLOR }} />
        <span className="text-on-surface text-sm font-semibold">{formatInr(value)}</span>
      </div>
    </div>
  );
}

export default function SalesChart({ data, period }: SalesChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[32px]">
          show_chart
        </span>
        <p className="text-body-md text-on-surface-variant">No sales in this period.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.1} />
            <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis
          dataKey="label"
          tickFormatter={(label: string) => formatTick(label, period)}
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          axisLine={{ stroke: GRID_COLOR }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompactInr}
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={SalesTooltip} cursor={{ stroke: GRID_COLOR, strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="none"
          fill="url(#salesAreaFill)"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke={LINE_COLOR}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: LINE_COLOR, stroke: '#1c1b1b', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
