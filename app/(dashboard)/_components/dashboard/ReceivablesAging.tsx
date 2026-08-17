'use client';

import { useRouter } from 'next/navigation';
import type { ReceivablesAging as ReceivablesAgingData } from '../../_lib/dashboard-types';
import EmptyState from './EmptyState';

interface ReceivablesAgingProps {
  data: ReceivablesAgingData;
}

function formatINR(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(val);
}

const BUCKETS = [
  { key: 'bucket0_30', label: '0–30 days', bar: 'bg-status-success', text: 'text-status-success' },
  { key: 'bucket31_60', label: '31–60 days', bar: 'bg-status-warning', text: 'text-status-warning' },
  { key: 'bucket60plus', label: '60+ days', bar: 'bg-status-error', text: 'text-status-error' },
] as const;

export default function ReceivablesAging({ data }: ReceivablesAgingProps) {
  const router = useRouter();

  if (data.total <= 0) {
    return <EmptyState icon="task_alt" message="No outstanding customer invoices." />;
  }

  const goToUnpaid = () => router.push('/invoices?paymentStatus=UNPAID');

  return (
    <div className="flex flex-col gap-4">
      {/* Stacked proportional bar */}
      <div className="bg-surface-container-highest flex h-3 w-full overflow-hidden rounded-full">
        {BUCKETS.map((b) => {
          const amount = data[b.key];
          const pct = (amount / data.total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={b.key}
              className={`${b.bar} h-full`}
              style={{ width: `${pct}%` }}
              title={`${b.label}: ${formatINR(amount)}`}
            />
          );
        })}
      </div>

      <ul className="divide-outline-variant divide-y-[0.5px]">
        {BUCKETS.map((b) => {
          const amount = data[b.key];
          const pct = data.total > 0 ? Math.round((amount / data.total) * 100) : 0;
          return (
            <li key={b.key} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <button
                onClick={goToUnpaid}
                className="text-on-surface hover:text-primary text-body-md flex items-center gap-2 text-left transition-colors"
              >
                <span className={`size-2 rounded-full ${b.bar}`} aria-hidden />
                {b.label}
              </button>
              <span className="flex items-center gap-3">
                <span className="text-on-surface-variant text-[11px]">{pct}%</span>
                <span className={`text-data-tabular font-semibold ${b.text}`}>
                  {formatINR(amount)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="border-outline-variant flex items-center justify-between border-t-[0.5px] pt-3">
        <span className="text-on-surface-variant text-[11px] font-medium tracking-widest uppercase">
          Total Open
        </span>
        <span className="text-on-surface text-data-tabular font-semibold">
          {formatINR(data.total)}
        </span>
      </div>
    </div>
  );
}
