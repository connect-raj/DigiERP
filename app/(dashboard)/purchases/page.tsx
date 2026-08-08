'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar, FilterSelect } from '@/components/ui/ListToolbar';
import { StatusPill, type Status } from '@/components/ui/StatusPill';

const PAGE_LIMIT = 20;

type Vendor = {
  id: string;
  name: string;
};

type Purchase = {
  id: string;
  purchaseNo: string;
  vendorId: string;
  vendor: { name: string };
  date: string;
  totalAmount: string | number;
  paidAmount: string | number;
  paymentStatus: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  isCancelled?: boolean;
};

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

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vendorFilter, setVendorFilter] = useState('All');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [stats, setStats] = useState({
    totalValue: 0,
    pendingPayments: 0,
    activeVendors: 0,
    procurementHealth: 100,
  });

  const fetchVendors = async () => {
    try {
      // Filter dropdown needs the full list, not a paginated page.
      const res = await fetch('/api/vendors?limit=1000');
      const data = await res.json();
      if (data.data) {
        setVendors(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch vendors', error);
    }
  };

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/purchases', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (statusFilter !== 'All')
        url.searchParams.append('paymentStatus', statusFilter.toUpperCase());
      if (vendorFilter !== 'All') url.searchParams.append('vendorId', vendorFilter);
      url.searchParams.append('page', String(page));
      url.searchParams.append('limit', String(PAGE_LIMIT));

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setPurchases(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
        setStats({
          totalValue: data.summary?.totalValue ?? 0,
          pendingPayments: data.summary?.pendingPayments ?? 0,
          activeVendors: data.summary?.activeVendors ?? 0,
          procurementHealth: data.summary?.procurementHealth ?? 100,
        });
      }
    } catch (error) {
      console.error('Failed to fetch purchases', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchVendors();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, statusFilter, vendorFilter]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchPurchases();
  }, [search, statusFilter, vendorFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<Purchase, unknown>[]>(
    () => [
      {
        id: 'purchaseNo',
        accessorFn: (p) => p.purchaseNo,
        header: 'Purchase #',
        cell: ({ row }) => (
          <span className="font-mono font-semibold">{row.original.purchaseNo}</span>
        ),
      },
      {
        id: 'vendor',
        accessorFn: (p) => p.vendor.name,
        header: 'Vendor',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="bg-surface-container-high text-accent-cyan flex h-8 w-8 items-center justify-center rounded text-xs font-bold">
              {row.original.vendor.name.substring(0, 2).toUpperCase()}
            </div>
            <span className="font-medium">{row.original.vendor.name}</span>
          </div>
        ),
      },
      {
        id: 'date',
        accessorFn: (p) => new Date(p.date).getTime(),
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-on-surface-variant">{formatDate(row.original.date)}</span>
        ),
      },
      {
        id: 'totalAmount',
        accessorFn: (p) => Number(p.totalAmount),
        header: 'Total Amount',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono font-medium">{formatINR(row.original.totalAmount)}</span>
        ),
      },
      {
        id: 'paymentStatus',
        accessorFn: (p) => p.paymentStatus,
        header: 'Payment Status',
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
        searchPlaceholder="Search orders..."
        filters={
          <>
            <FilterSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {['All', 'Paid', 'Partial', 'Unpaid'].map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Statuses' : s}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
              <option value="All">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </FilterSelect>
          </>
        }
        actions={
          <Button asChild>
            <Link href="/purchases/new">
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Purchase
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="bg-surface-container-low border-border rounded-xl border p-5">
          <p className="text-on-surface-variant mb-1 text-[11px] font-medium tracking-widest uppercase">
            Total Purchase Value
          </p>
          <p className="text-on-surface font-mono text-xl font-semibold">
            {formatINR(stats.totalValue)}
          </p>
        </div>
        <div className="bg-surface-container-low border-border rounded-xl border p-5">
          <p className="text-on-surface-variant mb-1 text-[11px] font-medium tracking-widest uppercase">
            Pending Payments
          </p>
          <p className="text-status-error font-mono text-xl font-semibold">
            {formatINR(stats.pendingPayments)}
          </p>
        </div>
        <div className="bg-surface-container-low border-border rounded-xl border p-5">
          <p className="text-on-surface-variant mb-1 text-[11px] font-medium tracking-widest uppercase">
            Active Vendors
          </p>
          <p className="text-on-surface font-mono text-xl font-semibold">{stats.activeVendors}</p>
        </div>
        <div className="bg-surface-container-low border-border rounded-xl border p-5">
          <p className="text-on-surface-variant mb-1 text-[11px] font-medium tracking-widest uppercase">
            Procurement Health
          </p>
          <p className="text-accent-cyan font-mono text-xl font-semibold">
            {stats.procurementHealth}%
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={purchases}
        getRowId={(p) => p.id}
        loading={loading}
        onRowClick={(p) => router.push(`/purchases/${p.id}`)}
        emptyState={
          <EmptyState
            icon={<span className="material-symbols-outlined text-[40px]">shopping_cart</span>}
            title="No purchases found"
            description="Create a purchase order or adjust your filters."
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
