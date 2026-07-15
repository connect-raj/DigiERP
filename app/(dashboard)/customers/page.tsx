'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomerFormDrawer, { Customer } from './_components/CustomerFormDrawer';
import Pagination from '@/components/ui/Pagination';

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
    if (limit > 0 && outstanding > limit) return 'text-error';
    if (outstanding > 0) return 'text-amber-400';
    return 'text-on-surface-variant';
  };

  return (
    <div className="flex min-h-full flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <h1 className="font-headline-md text-headline-md text-primary">Customers</h1>
          <div className="bg-outline-variant mx-2 h-6 w-[1px]"></div>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined text-on-surface-variant absolute left-3 text-[20px]">
              search
            </span>
            <input
              className="bg-surface-container-lowest border-outline-variant text-body-md focus:border-secondary w-64 rounded-lg border-[0.5px] py-1.5 pr-4 pl-10 transition-colors focus:ring-0"
              placeholder="Firm name, city, or GSTIN..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={openCreateDrawer}
          className="bg-primary text-on-primary font-body-md flex items-center gap-2 rounded-lg px-5 py-2 font-semibold transition-colors duration-200 hover:opacity-90 active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add Customer
        </button>
      </div>

      <div className="bg-surface-container border-outline-variant flex flex-1 flex-col overflow-hidden rounded-xl border-[0.5px]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-high border-outline-variant border-b-[0.5px]">
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  Firm Name
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  Contact Person
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  City / State
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  GSTIN
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  Phone
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 text-right tracking-wider uppercase">
                  Outstanding
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 text-right tracking-wider uppercase">
                  Credit Limit
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-outline-variant/30 divide-y">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="bg-surface-variant h-4 w-full max-w-[120px] animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pagination.total === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[40px]">
                        groups
                      </span>
                      <p className="text-body-md text-on-surface-variant">
                        {search ? 'No customers match your search.' : 'No customers yet.'}
                      </p>
                      {!search && (
                        <button
                          onClick={openCreateDrawer}
                          className="text-secondary hover:text-primary text-body-sm mt-1 font-semibold transition-colors"
                        >
                          Add your first customer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const outstanding = Number(customer.outstandingBalance);
                  const limit = Number(customer.creditLimit);
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => router.push(`/customers/${customer.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-[#252525]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-surface-variant text-secondary flex h-8 w-8 items-center justify-center rounded text-[14px] font-bold">
                            {customer.firmName.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-body-md text-primary font-semibold">
                            {customer.firmName}
                          </span>
                        </div>
                      </td>
                      <td className="text-body-md text-on-surface-variant px-6 py-4">
                        {customer.contactPerson || '—'}
                      </td>
                      <td className="text-body-md text-on-surface-variant px-6 py-4">
                        {[customer.city, customer.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="font-data-tabular text-on-surface-variant px-6 py-4 text-[12px]">
                        {customer.gstin || '—'}
                      </td>
                      <td className="text-body-md text-on-surface-variant px-6 py-4">
                        {customer.phone || '—'}
                      </td>
                      <td
                        className={`font-data-tabular px-6 py-4 text-right font-semibold ${outstandingColor(outstanding, limit)}`}
                      >
                        {formatINR(outstanding)}
                      </td>
                      <td className="font-data-tabular text-on-surface-variant px-6 py-4 text-right">
                        {formatINR(limit)}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditDrawer(customer)}
                          className="text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded p-1.5 opacity-0 transition-all group-hover:opacity-100"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeactivate(customer)}
                          className="text-on-surface-variant hover:text-error hover:bg-surface-variant ml-1 rounded p-1.5 opacity-0 transition-all group-hover:opacity-100"
                          title="Deactivate"
                        >
                          <span className="material-symbols-outlined text-[18px]">person_off</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={PAGE_LIMIT}
            onPageChange={setPage}
          />
        )}
      </div>

      <CustomerFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchCustomers}
        editingCustomer={editingCustomer}
      />
    </div>
  );
}
