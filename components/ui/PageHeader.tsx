import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs?: Crumb[];
  title: string;
  description?: string;
  /** Primary action(s) — rendered at the trailing edge of the header row. */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  breadcrumbs,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header data-slot="page-header" className={cn('mb-6 flex flex-col gap-3', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="text-on-surface-variant flex flex-wrap items-center gap-1.5 text-xs">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                  {crumb.href && !isLast ? (
                    <Link href={crumb.href} className="hover:text-on-surface transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={cn(isLast && 'text-on-surface')}>{crumb.label}</span>
                  )}
                  {!isLast && <span className="text-outline-variant">/</span>}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-on-surface truncate text-xl font-semibold tracking-tight">
            {title}
          </h1>
          {description && <p className="text-on-surface-variant mt-1 text-sm">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
