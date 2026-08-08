'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar, FilterSelect } from '@/components/ui/ListToolbar';
import { StatusPill, type Status } from '@/components/ui/StatusPill';

type InvoiceCustomer = { id: string; firmName: string };

type Invoice = {
  id: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  customer: InvoiceCustomer;
  totalAmount: string | number;
  totalCgst: string | number;
  totalSgst: string | number;
  totalIgst: string | number;
  balanceDue: string | number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
};

type Customer = { id: string; firmName: string };

const PAGE_LIMIT = 20;

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

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState(() =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('customerId') || 'All'
      : 'All'
  );
  const [statusFilter, setStatusFilter] = useState(() =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('paymentStatus') || 'ALL'
      : 'ALL'
  );
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    outstanding: 0,
    paid: 0,
    pendingCount: 0,
  });

  useEffect(() => {
    // Filter dropdown needs the full list, not a paginated page.
    fetch('/api/customers?limit=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setCustomers(data.data);
      })
      .catch((error) => console.error('Failed to fetch customers', error));
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/invoices', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (customerFilter !== 'All') url.searchParams.append('customerId', customerFilter);
      if (statusFilter !== 'ALL') url.searchParams.append('paymentStatus', statusFilter);
      if (fromDate) url.searchParams.append('from', new Date(fromDate).toISOString());
      if (toDate) url.searchParams.append('to', new Date(toDate).toISOString());
      url.searchParams.append('page', String(page));
      url.searchParams.append('limit', String(PAGE_LIMIT));

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setInvoices(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
        setStats({
          totalInvoiced: data.summary?.totalInvoiced ?? 0,
          outstanding: data.summary?.outstanding ?? 0,
          paid: data.summary?.paid ?? 0,
          pendingCount: data.summary?.pendingCount ?? 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, customerFilter, statusFilter, fromDate, toDate]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchInvoices();
  }, [search, customerFilter, statusFilter, fromDate, toDate, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<Invoice, unknown>[]>(
    () => [
      {
        id: 'invoiceNo',
        accessorFn: (inv) => inv.invoiceNo,
        header: 'Invoice No',
        cell: ({ row }) => (
          <span className="font-mono font-semibold">{row.original.invoiceNo}</span>
        ),
      },
      {
        id: 'date',
        accessorFn: (inv) => new Date(inv.date).getTime(),
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-on-surface-variant">{formatDate(row.original.date)}</span>
        ),
      },
      {
        id: 'customer',
        accessorFn: (inv) => inv.customer.firmName,
        header: 'Customer',
        cell: ({ row }) => <span className="font-medium">{row.original.customer.firmName}</span>,
      },
      {
        id: 'balanceDue',
        accessorFn: (inv) => Number(inv.balanceDue),
        header: 'Balance Due',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span
            className={
              Number(row.original.balanceDue) > 0
                ? 'text-status-error font-mono font-medium'
                : 'text-on-surface-variant font-mono'
            }
          >
            {formatINR(row.original.balanceDue)}
          </span>
        ),
      },
      {
        id: 'totalAmount',
        accessorFn: (inv) => Number(inv.totalAmount),
        header: 'Total Amount',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono font-semibold">{formatINR(row.original.totalAmount)}</span>
        ),
      },
      {
        id: 'status',
        accessorFn: (inv) => inv.paymentStatus,
        header: 'Status',
        cell: ({ row }) => <StatusPill status={row.original.paymentStatus as Status} />,
      },
    ],
    []
  );

  return (
    <div className="flex min-h-full flex-col gap-6">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search invoice no..."
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
            <FilterSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
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
          <Button onClick={() => router.push('/invoices/new')}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Invoice
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="bg-surface-container-low border-border rounded-xl border p-5">
          <p className="text-on-surface-variant mb-1 text-[11px] font-medium tracking-widest uppercase">
            Total Invoiced
          </p>
          <p className="text-on-surface font-mono text-xl font-semibold">
            {formatINR(stats.totalInvoiced)}
          </p>
        </div>
        <div className="bg-surface-container-low border-border rounded-xl border p-5">
          <p className="text-on-surface-variant mb-1 text-[11px] font-medium tracking-widest uppercase">
            Outstanding
          </p>
          <p className="text-status-error font-mono text-xl font-semibold">
            {formatINR(stats.outstanding)}
          </p>
        </div>
        <div className="bg-surface-container-low border-border rounded-xl border p-5">
          <p className="text-on-surface-variant mb-1 text-[11px] font-medium tracking-widest uppercase">
            Paid
          </p>
          <p className="text-status-success font-mono text-xl font-semibold">
            {formatINR(stats.paid)}
          </p>
        </div>
        <div className="bg-surface-container-low border-border rounded-xl border p-5">
          <p className="text-on-surface-variant mb-1 text-[11px] font-medium tracking-widest uppercase">
            Pending Invoices
          </p>
          <p className="text-on-surface font-mono text-xl font-semibold">{stats.pendingCount}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        getRowId={(inv) => inv.id}
        loading={loading}
        emptyState={
          <EmptyState
            icon={<span className="material-symbols-outlined text-[40px]">receipt_long</span>}
            title="No invoices found"
            description="Create an invoice or adjust your filters to see results."
          />
        }
        renderExpanded={(invoice) => (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-on-surface-variant text-xs">CGST</dt>
                <dd className="font-mono">
                  {Number(invoice.totalCgst) > 0 ? formatINR(invoice.totalCgst) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">SGST</dt>
                <dd className="font-mono">
                  {Number(invoice.totalSgst) > 0 ? formatINR(invoice.totalSgst) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">IGST</dt>
                <dd className="font-mono">
                  {Number(invoice.totalIgst) > 0 ? formatINR(invoice.totalIgst) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">Balance Due</dt>
                <dd className="font-mono">{formatINR(invoice.balanceDue)}</dd>
              </div>
            </dl>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/api/invoices/${invoice.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  PDF
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/invoices/${invoice.id}`);
                }}
              >
                View detail
              </Button>
            </div>
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
