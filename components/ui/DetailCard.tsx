import { cn } from '@/lib/utils';

interface DetailCardProps {
  title?: string;
  /** Trailing header content (actions, status pill, meta). */
  headerAside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Shared container for record-detail sections. Consistent surface, border, and
 * header treatment across every module's detail page.
 */
export function DetailCard({
  title,
  headerAside,
  children,
  className,
  contentClassName,
}: DetailCardProps) {
  return (
    <section
      data-slot="detail-card"
      className={cn(
        'bg-surface-container-low border-border overflow-hidden rounded-xl border',
        className
      )}
    >
      {(title || headerAside) && (
        <div className="border-border flex items-center justify-between gap-4 border-b px-5 py-3.5">
          {title && (
            <h2 className="font-heading text-on-surface text-sm font-semibold tracking-tight">
              {title}
            </h2>
          )}
          {headerAside && <div className="flex items-center gap-2">{headerAside}</div>}
        </div>
      )}
      <div className={cn('p-5', contentClassName)}>{children}</div>
    </section>
  );
}
