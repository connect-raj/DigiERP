import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Any renderable icon (Material Symbol span, lucide icon, etc.). */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Call-to-action, e.g. a Button. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Consistent "no records" pattern used across every list/detail page.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className
      )}
    >
      {icon && <div className="text-on-surface-variant text-3xl">{icon}</div>}
      <div className="space-y-1">
        <p className="text-on-surface text-sm font-medium">{title}</p>
        {description && (
          <p className="text-on-surface-variant mx-auto max-w-sm text-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
