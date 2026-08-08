'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import RecordPaymentModal from './_components/RecordPaymentModal';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar, FilterSelect } from '@/components/ui/ListToolbar';
import { StatusPill, type Status } from '@/components/ui/StatusPill';

type PaymentCustomer = { id: string; firmName: string };
type RecordedBy = { id: string; username: string } | null;

type Payment = {
  id: string;
  customerId: string;
  customer: PaymentCustomer;
  amount: string | number;
  onAccount: string | number;
  mode: string;
  reference: string | null;
  status?: 'ACTIVE' | 'VOID';
  date: string;
  createdAt: string;
  recordedBy: RecordedBy;
};

function paymentStatus(p: Payment): Status {
  if (p.status === 'VOID') return 'VOID';
  if (Number(p.onAccount) > 0) return 'ON_ACCOUNT';
  return 'ACTIVE';
}

type Customer = { id: string; firmName: string };

const PAGE_LIMIT = 20;
const MODES = ['ALL', 'CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER'];

function formatINR(val: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function formatDate(val: string) {
  return new Date(val).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState(() =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('customerId') || 'All'
      : 'All'
  );
  const [modeFilter, setModeFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalAllocated: 0,
    totalUnallocated: 0,
    count: 0,
  });

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const columns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        id: 'date',
        accessorFn: (p) => new Date(p.date).getTime(),
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-on-surface-variant">{formatDate(row.original.date)}</span>
        ),
      },
      {
        id: 'customer',
        accessorFn: (p) => p.customer.firmName,
        header: 'Customer',
        cell: ({ row }) => <span className="font-medium">{row.original.customer.firmName}</span>,
      },
      {
        id: 'amount',
        accessorFn: (p) => Number(p.amount),
        header: 'Amount',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono font-semibold">{formatINR(row.original.amount)}</span>
        ),
      },
      {
        id: 'mode',
        accessorFn: (p) => p.mode,
        header: 'Mode',
        cell: ({ row }) => (
          <span className="text-on-surface-variant">{row.original.mode.replace('_', ' ')}</span>
        ),
      },
      {
        id: 'reference',
        accessorFn: (p) => p.reference ?? '',
        header: 'Reference',
        cell: ({ row }) => (
          <span className="text-on-surface-variant font-mono">{row.original.reference || '—'}</span>
        ),
      },
      {
        id: 'onAccount',
        accessorFn: (p) => Number(p.onAccount),
        header: 'On Account',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span
            className={
              Number(row.original.onAccount) > 0
                ? 'text-accent-yellow font-mono font-semibold'
                : 'text-on-surface-variant font-mono'
            }
          >
            {formatINR(row.original.onAccount)}
          </span>
        ),
      },
      {
        id: 'status',
        accessorFn: (p) => paymentStatus(p),
        header: 'Status',
        cell: ({ row }) => <StatusPill status={paymentStatus(row.original)} />,
      },
    ],
    []
  );

  useEffect(() => {
    // Filter dropdown needs the full list, not a paginated page.
    fetch('/api/customers?limit=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setCustomers(data.data);
      })
      .catch((error) => console.error('Failed to fetch customers', error));
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/payments', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (customerFilter !== 'All') url.searchParams.append('customerId', customerFilter);
      if (modeFilter !== 'ALL') url.searchParams.append('mode', modeFilter);
      if (fromDate) url.searchParams.append('from', new Date(fromDate).toISOString());
      if (toDate) url.searchParams.append('to', new Date(toDate).toISOString());
      url.searchParams.append('page', String(page));
      url.searchParams.append('limit', String(PAGE_LIMIT));

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setPayments(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
        setStats({
          totalReceived: data.summary?.totalReceived ?? 0,
          totalAllocated: data.summary?.totalAllocated ?? 0,
          totalUnallocated: data.summary?.totalUnallocated ?? 0,
          count: data.summary?.count ?? 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch payments', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, customerFilter, modeFilter, fromDate, toDate]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchPayments();
  }, [search, customerFilter, modeFilter, fromDate, toDate, page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-full flex-col gap-6">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reference..."
        filters={
          <>
            <FilterSelect
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            >
              <option value="All">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firmName}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m === 'ALL' ? 'All Modes' : m.replace('_', ' ')}
                </option>
              ))}
            </FilterSelect>
            <div className="bg-surface-container-low border-border flex h-9 items-center gap-2 rounded-lg border px-3">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                calendar_today
              </span>
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
          </>
        }
        actions={
          <Button onClick={() => setIsRecordModalOpen(true)}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Record Payment
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="bg-surface-container-low border-border rounded-xl border p-5">
          <p className="text-on-surface-variant mb-1 text-[11px] font-medium tracking-widest uppercase">
            Total Received
          </p>
          <p className="text-on-surface font-mono text-xl font-semibold">
            {formatINR(stats.totalReceived)}
          </p>
        </div>
        <div className="bg-surface-container-low border-border rounded-xl border p-5">
          <p className="text-on-surface-variant mb-1 text-[11px] font-medium tracking-widest uppercase">
            Allocated
          </p>
          <p className="text-accent-cyan font-mono text-xl font-semibold">
            {formatINR(stats.totalAllocated)}
          </p>
        </div>
        <div className="bg-surface-container-low border-border rounded-xl border p-5">
          <p className="text-on-surface-variant mb-1 text-[11px] font-medium tracking-widest uppercase">
            Available Credit
          </p>
          <p className="text-accent-yellow font-mono text-xl font-semibold">
            {formatINR(stats.totalUnallocated)}
          </p>
        </div>
        <div className="bg-surface-container-low border-border rounded-xl border p-5">
          <p className="text-on-surface-variant mb-1 text-[11px] font-medium tracking-widest uppercase">
            Payments
          </p>
          <p className="text-on-surface font-mono text-xl font-semibold">{stats.count}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        getRowId={(p) => p.id}
        loading={loading}
        emptyState={
          <EmptyState
            icon={<span className="material-symbols-outlined text-[40px]">payments</span>}
            title="No payments found"
            description="Record a payment or adjust your filters to see results."
          />
        }
        renderExpanded={(payment) => (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-on-surface-variant text-xs">Allocated</dt>
                <dd className="font-mono">
                  {formatINR(Number(payment.amount) - Number(payment.onAccount))}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">On Account</dt>
                <dd className="font-mono">{formatINR(payment.onAccount)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">Recorded By</dt>
                <dd>{payment.recordedBy?.username || '—'}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">Customer</dt>
                <dd>{payment.customer.firmName}</dd>
              </div>
            </dl>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/payments/${payment.id}`);
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

      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={fetchPayments}
      />
    </div>
  );
}
