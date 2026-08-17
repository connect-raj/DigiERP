'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getFinancialYearLabel } from '@/lib/period';
import { buildBreadcrumbs } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  const financialYearLabel = getFinancialYearLabel();

  const crumbs = buildBreadcrumbs(pathname);
  const trail = crumbs.slice(0, -1);
  const current = crumbs[crumbs.length - 1];

  return (
    <header className="text-primary border-border bg-background/90 sticky top-0 z-40 flex h-[88px] w-full items-center justify-between border-b-[0.5px] px-4 backdrop-blur-md sm:px-6 lg:px-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="text-on-surface-variant hover:text-primary transition-colors lg:hidden"
          title="Toggle navigation"
          aria-label="Toggle navigation"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
        <div className="flex min-w-0 flex-col gap-0.5">
          {trail.length > 0 && (
            <nav aria-label="Breadcrumb">
              <ol className="text-on-surface-variant flex flex-wrap items-center gap-1.5 text-xs">
                {trail.map((crumb, i) => (
                  <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-on-surface transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                    <span className="text-outline-variant">/</span>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <span
            className={cn(
              'font-display text-primary truncate text-[22px] font-semibold tracking-tight'
            )}
          >
            {current?.label}
          </span>
        </div>
      </div>
      <div className="font-body-md flex items-center gap-4 text-sm">
        <div className="mr-2 flex items-center gap-2">
          <span className="border-border bg-surface-container text-on-surface-variant hover:bg-surface-container-high cursor-pointer rounded-md border-[0.5px] px-3.5 py-1.5 text-[12px] font-medium transition-all">
            {financialYearLabel}
          </span>
        </div>
        <div className="border-border bg-surface-container flex h-10 w-10 items-center justify-center rounded-full border-[0.5px]">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
            person
          </span>
        </div>
      </div>
    </header>
  );
}
