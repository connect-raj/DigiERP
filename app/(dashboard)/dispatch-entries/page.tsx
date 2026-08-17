'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar, FilterSelect } from '@/components/ui/ListToolbar';
import { StatusPill, type Status } from '@/components/ui/StatusPill';

const PAGE_LIMIT = 20;

type Customer = {
  id: string;
  firmName: string;
};

type DispatchEntry = {
  id: string;
  challanNo: string;
  customerId: string;
  place: string;
  date: string;
  entryDate: string;
  status: 'PENDING_BILLING' | 'BILLED';
  isCancelled: boolean;
  totalAmount: string | number;
  customer: {
    id: string;
    firmName: string;
  };
  _count?: {
    items: number;
  };
};

function formatINR(val: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(val));
}

function formatDate(val: string) {
  return new Date(val).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function dispatchStatus(entry: DispatchEntry): Status {
  if (entry.isCancelled) return 'CANCELLED';
  return entry.status === 'BILLED' ? 'INVOICED' : 'DISPATCHED';
}

function DispatchEntriesContent() {
  const router = useRouter();
  // Seed filters from the URL so deep links (e.g. the dashboard "Awaiting Invoicing"
  // tile → ?status=PENDING_BILLING, or a customer's "View All" → ?customerId=…) land
  // pre-filtered. useSearchParams is consistent across SSR + client navigation, unlike
  // reading window.location in a useState initializer (which loses the value on refresh).
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const customerParam = searchParams.get('customerId');
  const [entries, setEntries] = useState<DispatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_BILLING' | 'BILLED'>(
    statusParam === 'PENDING_BILLING' || statusParam === 'BILLED' ? statusParam : 'ALL'
  );
  const [customerFilter, setCustomerFilter] = useState(customerParam ?? 'ALL');
  const [showCancelled, setShowCancelled] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchCustomers = async () => {
    try {
      // Filter dropdown needs the full list, not a paginated page.
      const res = await fetch('/api/customers?limit=1000');
      const data = await res.json();
      if (data.data) {
        setCustomers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  const fetchDispatchEntries = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/dispatch-entries', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (statusFilter !== 'ALL') url.searchParams.append('status', statusFilter);
      if (customerFilter !== 'ALL') url.searchParams.append('customerId', customerFilter);
      url.searchParams.append('isCancelled', showCancelled.toString());
      if (fromDate) url.searchParams.append('from', new Date(fromDate).toISOString());
      if (toDate) url.searchParams.append('to', new Date(toDate).toISOString());
      url.searchParams.append('page', String(page));
      url.searchParams.append('limit', String(PAGE_LIMIT));

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setEntries(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
      }
    } catch (error) {
      console.error('Failed to fetch dispatch entries', error);
    } finally {
      setLoading(false);
    }
  };

  // Re-seed filters whenever the URL query changes. Query-only navigation (e.g. clicking
  // the dashboard "Awaiting Invoicing" tile) does NOT remount this page, so the useState
  // initializers above run only once — this effect keeps the filters in sync with deep links.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatusFilter(
      statusParam === 'PENDING_BILLING' || statusParam === 'BILLED' ? statusParam : 'ALL'
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomerFilter(customerParam ?? 'ALL');
  }, [statusParam, customerParam]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCustomers();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, statusFilter, customerFilter, showCancelled, fromDate, toDate]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchDispatchEntries();
  }, [search, statusFilter, customerFilter, showCancelled, fromDate, toDate, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<DispatchEntry, unknown>[]>(
    () => [
      {
        id: 'challanNo',
        accessorFn: (e) => e.challanNo,
        header: 'Challan No.',
        cell: ({ row }) => (
          <span className="font-mono font-semibold">{row.original.challanNo}</span>
        ),
      },
      {
        id: 'customer',
        accessorFn: (e) => e.customer?.firmName ?? '',
        header: 'Customer',
        cell: ({ row }) => <span className="font-medium">{row.original.customer?.firmName}</span>,
      },
      {
        id: 'date',
        accessorFn: (e) => new Date(e.date).getTime(),
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-on-surface-variant">{formatDate(row.original.date)}</span>
        ),
      },
      {
        id: 'place',
        accessorFn: (e) => e.place,
        header: 'Place',
        cell: ({ row }) => <span className="text-on-surface-variant">{row.original.place}</span>,
      },
      {
        id: 'totalAmount',
        accessorFn: (e) => Number(e.totalAmount),
        header: 'Total Amount',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono font-medium">{formatINR(row.original.totalAmount)}</span>
        ),
      },
      {
        id: 'status',
        accessorFn: (e) => dispatchStatus(e),
        header: 'Status',
        cell: ({ row }) => <StatusPill status={dispatchStatus(row.original)} />,
      },
    ],
    []
  );

  return (
    <div className="flex min-h-full flex-col gap-6">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by Challan No..."
        filters={
          <>
            <FilterSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_BILLING">Pending Billing</option>
              <option value="BILLED">Billed</option>
            </FilterSelect>
            <FilterSelect
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            >
              <option value="ALL">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firmName}
                </option>
              ))}
            </FilterSelect>
            <div className="bg-surface-container-low border-border flex h-9 items-center gap-2 rounded-lg border px-3">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-on-surface w-28 border-none bg-transparent p-0 text-sm focus:ring-0 focus:outline-none"
              />
              <span className="text-on-surface-variant">–</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-on-surface w-28 border-none bg-transparent p-0 text-sm focus:ring-0 focus:outline-none"
              />
            </div>
            <label className="text-on-surface-variant flex cursor-pointer items-center gap-2 text-sm select-none">
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) => setShowCancelled(e.target.checked)}
                className="accent-accent-cyan h-4 w-4"
              />
              Show cancelled
            </label>
          </>
        }
        actions={
          <Button asChild>
            <Link href="/dispatch-entries/new">
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Dispatch Entry
            </Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={entries}
        getRowId={(e) => e.id}
        loading={loading}
        emptyState={
          <EmptyState
            icon={<span className="material-symbols-outlined text-[40px]">local_shipping</span>}
            title="No dispatch entries found"
            description="Try adjusting your filters or record a new dispatch entry."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dispatch-entries/new">Create new entry</Link>
              </Button>
            }
          />
        }
        renderExpanded={(entry) => (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-on-surface-variant text-xs">Items</dt>
                <dd className="font-mono">{entry._count?.items ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">Place</dt>
                <dd>{entry.place}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">Total</dt>
                <dd className="font-mono">{formatINR(entry.totalAmount)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">Status</dt>
                <dd>
                  <StatusPill status={dispatchStatus(entry)} />
                </dd>
              </div>
            </dl>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dispatch-entries/${entry.id}`);
              }}
            >
              View detail
            </Button>
          </div>
        )}
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

export default function DispatchEntriesPage() {
  return (
    <Suspense
      fallback={
        <div className="text-on-surface-variant flex h-full items-center justify-center p-12">
          Loading...
        </div>
      }
    >
      <DispatchEntriesContent />
    </Suspense>
  );
}
