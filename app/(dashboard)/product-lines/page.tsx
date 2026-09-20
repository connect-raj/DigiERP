'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar, FilterSelect } from '@/components/ui/ListToolbar';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

const PAGE_LIMIT = 20;

type ProductLine = {
  id: string;
  kind: 'INK' | 'MACHINE' | 'SPARE_PART';
  name: string;
  slug: string;
  invoiceName: string | null;
  isActive: boolean;
  brand: { id: string; name: string } | null;
  technology: { id: string; name: string } | null;
  role: { id: string; name: string } | null;
  taxClass: { id: string; name: string };
};

const KIND_LABELS: Record<ProductLine['kind'], string> = {
  INK: 'Ink',
  MACHINE: 'Machine',
  SPARE_PART: 'Spare Part',
};

export default function ProductLinesPage() {
  const router = useRouter();
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchLines = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/product-lines', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (kind) url.searchParams.append('kind', kind);
      url.searchParams.append('page', String(page));
      url.searchParams.append('limit', String(PAGE_LIMIT));
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setLines(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
      }
    } catch (error) {
      console.error('Failed to fetch product lines', error);
      showErrorToast(error, 'Failed to load product lines');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (line: ProductLine) => {
    try {
      setTogglingId(line.id);
      const res = await fetch(`/api/product-lines/${line.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !line.isActive }),
      });
      if (res.ok) {
        showSuccessToast(line.isActive ? 'Product line deactivated' : 'Product line activated');
        fetchLines();
      } else {
        const error = await res.json();
        showErrorToast(error, 'Failed to update status');
      }
    } catch (error) {
      console.error('Failed to toggle status', error);
      showErrorToast(error, 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the product line "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/product-lines/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccessToast('Product line deleted');
        fetchLines();
      } else {
        const error = await res.json();
        showErrorToast(error, 'Failed to delete product line');
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to delete product line', error);
      showErrorToast(error, 'Failed to delete product line');
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, kind]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchLines();
  }, [search, kind, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<ProductLine, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (l) => l.name,
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-on-surface-variant text-xs">{row.original.slug}</span>
          </div>
        ),
      },
      {
        id: 'kind',
        accessorFn: (l) => l.kind,
        header: 'Kind',
        cell: ({ row }) => (
          <span className="bg-surface-container-high text-on-surface-variant rounded-full px-2 py-0.5 text-[11px] font-medium uppercase">
            {KIND_LABELS[row.original.kind]}
          </span>
        ),
      },
      {
        id: 'brand',
        accessorFn: (l) => l.brand?.name ?? '',
        header: 'Brand',
        cell: ({ row }) => row.original.brand?.name ?? <span className="text-on-surface-variant/50">—</span>,
      },
      {
        id: 'technology',
        accessorFn: (l) => l.technology?.name ?? '',
        header: 'Technology',
        cell: ({ row }) =>
          row.original.technology?.name ?? <span className="text-on-surface-variant/50">—</span>,
      },
      {
        id: 'role',
        accessorFn: (l) => l.role?.name ?? '',
        header: 'Role',
        cell: ({ row }) => row.original.role?.name ?? <span className="text-on-surface-variant/50">—</span>,
      },
      {
        id: 'taxClass',
        accessorFn: (l) => l.taxClass.name,
        header: 'Tax Class',
      },
      {
        id: 'invoiceName',
        accessorFn: (l) => (l.invoiceName ? 1 : 0),
        header: 'Invoice Name',
        cell: ({ row }) =>
          row.original.invoiceName ? (
            row.original.invoiceName
          ) : (
            <span className="bg-status-error/12 text-status-error rounded-full px-2 py-0.5 text-[11px] font-medium">
              No invoice name
            </span>
          ),
      },
      {
        id: 'status',
        accessorFn: (l) => (l.isActive ? 1 : 0),
        header: 'Status',
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(row.original);
            }}
            disabled={togglingId === row.original.id}
            className={
              (row.original.isActive
                ? 'bg-status-success/12 text-status-success rounded-full px-2 py-0.5 text-[11px] font-medium uppercase'
                : 'bg-status-neutral/12 text-status-neutral rounded-full px-2 py-0.5 text-[11px] font-medium uppercase') +
              ' disabled:opacity-50'
            }
            title="Click to toggle status"
          >
            {row.original.isActive ? 'Active' : 'Inactive'}
          </button>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/product-lines/${row.original.id}`);
              }}
              className="text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-md p-1.5 transition-colors"
              title="Edit"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.original.id, row.original.name);
              }}
              className="text-on-surface-variant hover:text-status-error hover:bg-surface-container-high rounded-md p-1.5 transition-colors"
              title="Delete"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [togglingId]
  );

  return (
    <div className="flex min-h-full flex-col gap-6">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search product lines by name..."
        filters={
          <FilterSelect value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">All Kinds</option>
            <option value="INK">Ink</option>
            <option value="MACHINE">Machine</option>
            <option value="SPARE_PART">Spare Part</option>
          </FilterSelect>
        }
        actions={
          <Button onClick={() => router.push('/product-lines/new')}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Product Line
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={lines}
        getRowId={(l) => l.id}
        loading={loading}
        onRowClick={(l) => router.push(`/product-lines/${l.id}`)}
        emptyState={
          <EmptyState
            icon={<span className="material-symbols-outlined text-[40px]">category</span>}
            title="No product lines found"
            description="Add a product line or adjust your search."
          />
        }
        footer={
          !loading && (
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={PAGE_LIMIT}
              onPageChange={setPage}
            />
          )
        }
      />
    </div>
  );
}
