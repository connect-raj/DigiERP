'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import CustomerFormDrawer, { Customer } from './_components/CustomerFormDrawer';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';

const PAGE_LIMIT = 20;

function formatINR(val: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(val));
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/customers', window.location.origin);
      if (search) url.searchParams.append('search', search);
      url.searchParams.append('page', String(page));
      url.searchParams.append('limit', String(PAGE_LIMIT));
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setCustomers(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
      }
    } catch (error) {
      console.error('Failed to fetch customers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchCustomers();
  }, [search, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreateDrawer = () => {
    setEditingCustomer(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDrawerOpen(true);
  };

  const handleDeactivate = async (customer: Customer) => {
    if (
      !window.confirm(
        `Deactivate ${customer.firmName}? They will be hidden from active lists. This is blocked if they have unpaid invoices or dispatches awaiting billing.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error?.message ?? 'Failed to deactivate customer');
        return;
      }
      fetchCustomers();
    } catch (error) {
      console.error('Failed to deactivate customer', error);
      window.alert('Failed to deactivate customer');
    }
  };

  const outstandingColor = (outstanding: number, limit: number) => {
    if (limit > 0 && outstanding > limit) return 'text-status-error';
    if (outstanding > 0) return 'text-accent-yellow';
    return 'text-on-surface-variant';
  };

  const columns = useMemo<ColumnDef<Customer, unknown>[]>(
    () => [
      {
        id: 'firmName',
        accessorFn: (c) => c.firmName,
        header: 'Firm Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="bg-surface-container-high text-accent-cyan flex h-8 w-8 items-center justify-center rounded text-xs font-bold">
              {row.original.firmName.substring(0, 2).toUpperCase()}
            </div>
            <span className="font-medium">{row.original.firmName}</span>
          </div>
        ),
      },
      {
        id: 'contactPerson',
        accessorFn: (c) => c.contactPerson ?? '',
        header: 'Contact Person',
        cell: ({ row }) => (
          <span className="text-on-surface-variant">{row.original.contactPerson || '—'}</span>
        ),
      },
      {
        id: 'location',
        accessorFn: (c) => [c.city, c.state].filter(Boolean).join(', '),
        header: 'City / State',
        cell: ({ row }) => (
          <span className="text-on-surface-variant">
            {[row.original.city, row.original.state].filter(Boolean).join(', ') || '—'}
          </span>
        ),
      },
      {
        id: 'gstin',
        accessorFn: (c) => c.gstin ?? '',
        header: 'GSTIN',
        cell: ({ row }) => (
          <span className="text-on-surface-variant font-mono text-xs">
            {row.original.gstin || '—'}
          </span>
        ),
      },
      {
        id: 'phone',
        accessorFn: (c) => c.phone ?? '',
        header: 'Phone',
        cell: ({ row }) => (
          <span className="text-on-surface-variant">{row.original.phone || '—'}</span>
        ),
      },
      {
        id: 'outstanding',
        accessorFn: (c) => Math.max(0, Number(c.pendingTotal ?? 0)),
        header: 'Outstanding',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const outstanding = Math.max(0, Number(row.original.pendingTotal ?? 0));
          const limit = Number(row.original.creditLimit);
          return (
            <span className={`font-mono font-semibold ${outstandingColor(outstanding, limit)}`}>
              {formatINR(outstanding)}
            </span>
          );
        },
      },
      {
        id: 'creditLimit',
        accessorFn: (c) => Number(c.creditLimit),
        header: 'Credit Limit',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="text-on-surface-variant font-mono">
            {formatINR(Number(row.original.creditLimit))}
          </span>
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
                openEditDrawer(row.original);
              }}
              className="text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded p-1.5 transition-colors"
              title="Edit"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeactivate(row.original);
              }}
              className="text-on-surface-variant hover:text-status-error hover:bg-surface-container-high rounded p-1.5 transition-colors"
              title="Deactivate"
            >
              <span className="material-symbols-outlined text-[18px]">person_off</span>
            </button>
          </div>
        ),
      },
    ],
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="flex min-h-full flex-col gap-6">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Firm name, city, or GSTIN..."
        actions={
          <Button onClick={openCreateDrawer}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Customer
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={customers}
        getRowId={(c) => c.id}
        loading={loading}
        onRowClick={(c) => router.push(`/customers/${c.id}`)}
        emptyState={
          <EmptyState
            icon={<span className="material-symbols-outlined text-[40px]">groups</span>}
            title={search ? 'No customers match your search' : 'No customers yet'}
            action={
              !search ? (
                <Button variant="outline" size="sm" onClick={openCreateDrawer}>
                  Add your first customer
                </Button>
              ) : undefined
            }
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

      <CustomerFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchCustomers}
        editingCustomer={editingCustomer}
      />
    </div>
  );
}
