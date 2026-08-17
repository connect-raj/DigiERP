'use client';

import { Fragment, useState } from 'react';
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  getRowId: (row: TData) => string;
  loading?: boolean;
  skeletonRows?: number;
  /** Rendered in the tbody area when there are no rows and not loading. */
  emptyState?: React.ReactNode;
  /** Navigate/act on a plain row click (ignored when renderExpanded is set). */
  onRowClick?: (row: TData) => void;
  /** When provided, clicking a row toggles an inline expanded panel below it. */
  renderExpanded?: (row: TData) => React.ReactNode;
  /** Footer slot, typically pagination. */
  footer?: React.ReactNode;
  className?: string;
}

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  loading = false,
  skeletonRows = 8,
  emptyState,
  onRowClick,
  renderExpanded,
  footer,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  });

  const colCount = columns.length;
  const isEmpty = !loading && data.length === 0;

  return (
    <div
      className={cn(
        'bg-surface-container-low border-border flex flex-col overflow-hidden rounded-xl border',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="bg-surface-container-high border-border text-on-surface-variant border-b text-[11px] font-medium tracking-widest uppercase"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const align = (header.column.columnDef.meta as { align?: string })?.align;
                  return (
                    <th
                      key={header.id}
                      className={cn('px-5 py-3.5 font-medium', align === 'right' && 'text-right')}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          disabled={!canSort}
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            'inline-flex items-center gap-1',
                            align === 'right' && 'flex-row-reverse',
                            canSort && 'hover:text-on-surface cursor-pointer'
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="material-symbols-outlined text-[16px] leading-none">
                              {sorted === 'asc'
                                ? 'arrow_upward'
                                : sorted === 'desc'
                                  ? 'arrow_downward'
                                  : 'unfold_more'}
                            </span>
                          )}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-border text-on-surface divide-y">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: colCount }).map((__, j) => (
                    <td key={j} className="px-5 py-3.5">
                      <div className="bg-surface-container-high h-4 w-full max-w-[120px] animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isEmpty ? (
              <tr>
                <td colSpan={colCount} className="p-0">
                  {emptyState}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isExpandable = Boolean(renderExpanded);
                const isExpanded = expandedId === row.id;
                const clickable = isExpandable || Boolean(onRowClick);
                return (
                  <Fragment key={row.id}>
                    <tr
                      onClick={
                        clickable
                          ? () =>
                              isExpandable
                                ? setExpandedId(isExpanded ? null : row.id)
                                : onRowClick?.(row.original)
                          : undefined
                      }
                      className={cn(
                        'bg-surface-container-low hover:bg-surface-container transition-colors',
                        clickable && 'cursor-pointer',
                        isExpanded && 'bg-surface-container'
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const align = (cell.column.columnDef.meta as { align?: string })?.align;
                        return (
                          <td
                            key={cell.id}
                            className={cn('px-5 py-3.5', align === 'right' && 'text-right')}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpandable && isExpanded && (
                      <tr className="bg-surface-container">
                        <td colSpan={colCount} className="border-border border-t px-5 py-4">
                          {renderExpanded!(row.original)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
