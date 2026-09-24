'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar, FilterSelect } from '@/components/ui/ListToolbar';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

const PAGE_LIMIT = 20;

type ApplicationType = { id: string; name: string };

type GalleryItem = {
  id: string;
  title: string;
  displayOrder: number;
  isPublished: boolean;
  applicationType: ApplicationType;
  image: { url: string; mimeType: string; altText: string | null };
  relatedProductLine: { id: string; name: string } | null;
};

function isImage(mimeType: string) {
  return mimeType.startsWith('image/');
}

export default function GalleryPage() {
  const router = useRouter();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [applicationTypes, setApplicationTypes] = useState<ApplicationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [applicationTypeId, setApplicationTypeId] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL('/api/gallery', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (applicationTypeId) url.searchParams.set('applicationTypeId', applicationTypeId);
      if (publishedFilter) url.searchParams.set('isPublished', publishedFilter);
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', String(PAGE_LIMIT));
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setItems(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
      }
    } catch (error) {
      console.error('Failed to fetch gallery items', error);
      showErrorToast(error, 'Failed to load gallery items');
    } finally {
      setLoading(false);
    }
  }, [search, applicationTypeId, publishedFilter, page]);

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const res = await fetch('/api/gallery-application-types?limit=200');
        const data = await res.json();
        if (data.data) setApplicationTypes(data.data);
      } catch (error) {
        console.error('Failed to load application types', error);
      }
    };
    loadTypes();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, applicationTypeId, publishedFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleTogglePublished = async (item: GalleryItem) => {
    try {
      setTogglingId(item.id);
      const res = await fetch(`/api/gallery/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !item.isPublished }),
      });
      if (res.ok) {
        showSuccessToast(item.isPublished ? 'Unpublished' : 'Published');
        fetchItems();
      } else {
        const error = await res.json();
        showErrorToast(error, 'Failed to update status');
      }
    } catch (error) {
      console.error('Failed to toggle published state', error);
      showErrorToast(error, 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete the gallery item "${title}"? This cannot be undone.`)) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccessToast('Gallery item deleted');
        fetchItems();
      } else {
        const error = await res.json();
        showErrorToast(error, 'Failed to delete gallery item');
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to delete gallery item', error);
      showErrorToast(error, 'Failed to delete gallery item');
      setLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<GalleryItem, unknown>[]>(
    () => [
      {
        id: 'image',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="border-border h-10 w-10 overflow-hidden rounded-md border bg-black/20">
            {isImage(row.original.image.mimeType) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.original.image.url}
                alt={row.original.image.altText ?? ''}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-on-surface-variant flex h-full w-full items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">description</span>
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'title',
        accessorFn: (i) => i.title,
        header: 'Title',
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
      {
        id: 'applicationType',
        accessorFn: (i) => i.applicationType.name,
        header: 'Application Type',
      },
      {
        id: 'productLine',
        accessorFn: (i) => i.relatedProductLine?.name ?? '',
        header: 'Product Line',
        cell: ({ row }) =>
          row.original.relatedProductLine?.name ?? (
            <span className="text-on-surface-variant/50">—</span>
          ),
      },
      {
        id: 'displayOrder',
        accessorFn: (i) => i.displayOrder,
        header: 'Order',
      },
      {
        id: 'status',
        accessorFn: (i) => (i.isPublished ? 1 : 0),
        header: 'Status',
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePublished(row.original);
            }}
            disabled={togglingId === row.original.id}
            className={
              (row.original.isPublished
                ? 'bg-status-success/12 text-status-success rounded-full px-2 py-0.5 text-[11px] font-medium uppercase'
                : 'bg-status-neutral/12 text-status-neutral rounded-full px-2 py-0.5 text-[11px] font-medium uppercase') +
              ' disabled:opacity-50'
            }
            title="Click to toggle publish status"
          >
            {row.original.isPublished ? 'Published' : 'Draft'}
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
                router.push(`/gallery/${row.original.id}`);
              }}
              className="text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-md p-1.5 transition-colors"
              title="Edit"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.original.id, row.original.title);
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
        searchPlaceholder="Search gallery items by title..."
        filters={
          <>
            <FilterSelect
              value={applicationTypeId}
              onChange={(e) => setApplicationTypeId(e.target.value)}
            >
              <option value="">All Types</option>
              {applicationTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={publishedFilter}
              onChange={(e) => setPublishedFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </FilterSelect>
          </>
        }
        actions={
          <>
            <Link
              href="/gallery/application-types"
              className="border-border text-on-surface-variant hover:bg-surface-container-high inline-flex h-8 items-center rounded-lg border px-2.5 text-sm font-medium transition-colors"
            >
              Manage Types
            </Link>
            <Button onClick={() => router.push('/gallery/new')}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Gallery Item
            </Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={items}
        getRowId={(i) => i.id}
        loading={loading}
        onRowClick={(i) => router.push(`/gallery/${i.id}`)}
        emptyState={
          <EmptyState
            icon={<span className="material-symbols-outlined text-[40px]">photo_library</span>}
            title="No gallery items found"
            description="Add a gallery item or adjust your search."
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
