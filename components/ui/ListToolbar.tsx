import { cn } from '@/lib/utils';

interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Module-specific filter controls (selects, date ranges, segmented buttons). */
  filters?: React.ReactNode;
  /** Primary action(s), e.g. a "New" button. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Consistent list toolbar: search input + module-specific filter slot + actions.
 * Same interaction pattern across every module; only the filter fields differ.
 */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  actions,
  className,
}: ListToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[280px]">
          <span className="material-symbols-outlined text-on-surface-variant pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-surface-container-low border-border text-on-surface placeholder:text-on-surface-variant focus:border-ring h-9 w-full rounded-lg border pr-3 pl-10 text-sm transition-colors focus:outline-none"
          />
        </div>
        {filters}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function FilterSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'bg-surface-container-low border-border text-on-surface-variant focus:border-ring h-9 cursor-pointer rounded-lg border px-3 text-sm focus:outline-none',
        className
      )}
      {...props}
    />
  );
}
