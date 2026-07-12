'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: PaginationProps) {
  if (total === 0) return null;

  return (
    <footer className="border-outline-variant bg-surface-container-high mt-auto flex items-center justify-between border-t-[0.5px] px-6 py-4">
      <span className="text-body-md text-on-surface-variant">
        Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="border-outline-variant text-on-surface-variant rounded border-[0.5px] p-2 disabled:opacity-30"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <span className="text-body-md text-on-surface-variant px-2">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="border-outline-variant text-on-surface-variant rounded border-[0.5px] p-2 disabled:opacity-30"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </footer>
  );
}
