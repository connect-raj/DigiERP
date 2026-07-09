'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { TopCategoryPoint } from '../../_lib/dashboard-types';

interface TopCategoryChartProps {
  data: TopCategoryPoint[];
}

const BAR_COLOR = '#adc6ff';
const GRID_COLOR = '#333333';
const AXIS_COLOR = '#8e9192';

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactInr(value: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function CategoryTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  if (typeof value !== 'number') return null;

  return (
    <div className="bg-surface-container-high border-outline-variant rounded-md border-[0.5px] px-3 py-2 shadow-lg">
      <p className="text-on-surface-variant mb-1 text-[11px]">{label}</p>
      <div className="flex items-center gap-2">
        <span className="h-[2px] w-3 shrink-0" style={{ backgroundColor: BAR_COLOR }} />
        <span className="text-on-surface text-sm font-semibold">{formatInr(value)}</span>
      </div>
    </div>
  );
}

export default function TopCategoryChart({ data }: TopCategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[32px]">
          bar_chart
        </span>
        <p className="text-body-md text-on-surface-variant">No category sales in this period.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
        barCategoryGap={8}
      >
        <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
        <XAxis
          type="number"
          tickFormatter={formatCompactInr}
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="categoryName"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={100}
        />
        <Tooltip content={CategoryTooltip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="amount" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
