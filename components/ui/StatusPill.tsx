import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

/**
 * Known transactional statuses across modules. StatusPill resolves each to a
 * semantic tone internally — callers pass a domain status, never a color.
 */
export type Status =
  // Invoice
  | 'UNPAID'
  | 'PARTIAL'
  | 'PAID'
  | 'VOID'
  // Dispatch
  | 'DISPATCHED'
  | 'INVOICED'
  // Payment
  | 'ACTIVE'
  | 'ON_ACCOUNT'
  // Generic
  | 'DRAFT'
  | 'OVERDUE'
  | 'CANCELLED';

const STATUS_TONE: Record<Status, Tone> = {
  UNPAID: 'warning',
  PARTIAL: 'info',
  PAID: 'success',
  VOID: 'error',
  DISPATCHED: 'info',
  INVOICED: 'info',
  ACTIVE: 'success',
  ON_ACCOUNT: 'warning',
  DRAFT: 'neutral',
  OVERDUE: 'error',
  CANCELLED: 'error',
};

const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-status-success/12 text-status-success',
  warning: 'bg-status-warning/12 text-status-warning',
  error: 'bg-status-error/12 text-status-error',
  info: 'bg-status-info/12 text-status-info',
  neutral: 'bg-status-neutral/12 text-status-neutral',
};

function humanize(status: Status) {
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface StatusPillProps {
  status: Status;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const tone = STATUS_TONE[status] ?? 'neutral';

  return (
    <span
      data-slot="status-pill"
      data-status={status}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASS[tone],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {humanize(status)}
    </span>
  );
}
