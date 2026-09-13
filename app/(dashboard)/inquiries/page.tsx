'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import Pagination from '@/components/ui/Pagination';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar, FilterSelect } from '@/components/ui/ListToolbar';
import { StatusPill } from '@/components/ui/StatusPill';

const PAGE_LIMIT = 20;

const SOURCES = ['WEBSITE', 'EXPO', 'INDIAMART', 'TRADEINDIA', 'MANUAL'] as const;
const STATUSES = ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'] as const;

type Inquiry = {
  id: string;
  source: (typeof SOURCES)[number];
  status: (typeof STATUSES)[number];
  company: string;
  contactName: string;
  phone: string;
  city: string | null;
  createdAt: string;
};

function formatDate(val: string) {
  return new Date(val).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function humanizeSource(source: string) {
  return source.charAt(0) + source.slice(1).toLowerCase();
}

export default function InquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | (typeof SOURCES)[number]>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | (typeof STATUSES)[number]>('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/inquiries', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (sourceFilter !== 'ALL') url.searchParams.append('source', sourceFilter);
      if (statusFilter !== 'ALL') url.searchParams.append('status', statusFilter);
      url.searchParams.append('page', String(page));
      url.searchParams.append('limit', String(PAGE_LIMIT));

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setInquiries(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
      }
    } catch (error) {
      console.error('Failed to fetch inquiries', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, sourceFilter, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchInquiries();
  }, [search, sourceFilter, statusFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<Inquiry, unknown>[]>(
    () => [
      {
        id: 'company',
        accessorFn: (i) => i.company,
        header: 'Company',
        cell: ({ row }) => (
          <div>
            <span className="font-medium">{row.original.company}</span>
            <span className="text-on-surface-variant block text-xs">
              {row.original.contactName}
            </span>
          </div>
        ),
      },
      {
        id: 'phone',
        accessorFn: (i) => i.phone,
        header: 'Phone',
        cell: ({ row }) => <span className="font-mono">{row.original.phone}</span>,
      },
      {
        id: 'city',
        accessorFn: (i) => i.city ?? '',
        header: 'City',
        cell: ({ row }) => (
          <span className="text-on-surface-variant">{row.original.city || '—'}</span>
        ),
      },
      {
        id: 'source',
        accessorFn: (i) => i.source,
        header: 'Source',
        cell: ({ row }) => (
          <span className="bg-surface-container-high text-on-surface-variant rounded px-2 py-0.5 text-[11px] font-medium uppercase">
            {humanizeSource(row.original.source)}
          </span>
        ),
      },
      {
        id: 'status',
        accessorFn: (i) => i.status,
        header: 'Status',
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        id: 'createdAt',
        accessorFn: (i) => new Date(i.createdAt).getTime(),
        header: 'Received',
        cell: ({ row }) => (
          <span className="text-on-surface-variant">{formatDate(row.original.createdAt)}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex min-h-full flex-col gap-6">
      <div>
        <h1 className="font-display text-display text-on-surface">Inquiries</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Triage inbound leads from the website, expos, and marketplace listings.
        </p>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by company, contact, or phone..."
        filters={
          <>
            <FilterSelect
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
            >
              <option value="ALL">All Sources</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {humanizeSource(s)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </FilterSelect>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={inquiries}
        getRowId={(i) => i.id}
        loading={loading}
        onRowClick={(inquiry) => router.push(`/inquiries/${inquiry.id}`)}
        emptyState={
          <EmptyState
            icon={<span className="material-symbols-outlined text-[40px]">contact_mail</span>}
            title="No inquiries found"
            description="Try adjusting your filters — new leads will appear here as they come in."
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
