'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function DispatchEntriesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<DispatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_BILLING' | 'BILLED'>('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [showCancelled, setShowCancelled] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Fetch customers for filters
  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.data) {
        setCustomers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  // Fetch dispatch entries based on filters
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

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setEntries(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dispatch entries', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCustomers();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    fetchDispatchEntries();
  }, [search, statusFilter, customerFilter, showCancelled, fromDate, toDate]);

  // Indian format helper for currency
  const formatINR = (val: string | number) => {
    const num = Number(val);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Header Area */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-headline-md text-headline-md text-primary">Dispatch Entries</h1>
          <p className="text-on-surface-variant text-body-sm mt-1">
            Digitally record and track physical Challan dispatches.
          </p>
        </div>
        <Link
          href="/dispatch-entries/new"
          className="bg-secondary-container hover:bg-secondary-container/85 text-on-secondary-container font-body-md flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-all duration-200 active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Dispatch Entry
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container border-outline-variant flex flex-col gap-4 rounded-xl border-[0.5px] p-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Box */}
          <div className="relative flex min-w-[240px] flex-1 items-center">
            <span className="material-symbols-outlined text-on-surface-variant absolute left-3 text-[20px]">
              search
            </span>
            <input
              className="bg-surface-container-lowest border-outline-variant text-body-md focus:border-secondary w-full rounded-lg border-[0.5px] py-2 pr-4 pl-10 transition-colors focus:ring-0"
              placeholder="Search by Challan No..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status Tabs */}
          <div className="bg-surface-container-low border-outline-variant flex rounded-lg border-[0.5px] p-1">
            {(
              [
                { label: 'All', value: 'ALL' },
                { label: 'Pending Billing', value: 'PENDING_BILLING' },
                { label: 'Billed', value: 'BILLED' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`text-body-md rounded-md px-4 py-1.5 font-medium transition-colors ${statusFilter === tab.value ? 'bg-surface-variant text-primary' : 'text-on-surface-variant hover:text-primary'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Customer Dropdown */}
          <div className="relative min-w-[200px]">
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="bg-surface-container-low border-outline-variant text-body-md text-on-surface-variant w-full appearance-none rounded-lg border-[0.5px] py-2.5 pr-10 pl-4 transition-colors outline-none hover:border-[#8e9192]"
            >
              <option value="ALL">Customer: All</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firmName}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-on-surface-variant pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[18px]">
              expand_more
            </span>
          </div>

          {/* Cancelled Toggle */}
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="accent-secondary h-4 w-4 rounded border-gray-300 focus:ring-0"
            />
            <span className="text-body-md text-on-surface-variant">Show cancelled</span>
          </label>
        </div>

        {/* Date Filters Row */}
        <div className="flex flex-wrap items-center gap-4 border-t border-[#2e2e2e]/50 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-on-surface-variant">From Date:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-surface-container-low border-outline-variant text-body-md text-on-surface rounded-lg border-[0.5px] px-3 py-1.5 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-on-surface-variant">To Date:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-surface-container-low border-outline-variant text-body-md text-on-surface rounded-lg border-[0.5px] px-3 py-1.5 outline-none"
            />
          </div>
          {(fromDate || toDate) && (
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
              className="text-body-sm text-secondary hover:underline"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface-container border-outline-variant flex flex-1 flex-col overflow-hidden rounded-xl border-[0.5px]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-high border-outline-variant border-b-[0.5px]">
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  Challan No.
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  Customer
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  Date
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  Place
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 text-right tracking-wider uppercase">
                  Total Amount
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  Status
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 text-right tracking-wider uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-outline-variant/30 divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-on-surface-variant p-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-secondary animate-spin text-[32px]">
                        progress_activity
                      </span>
                      <span>Loading dispatch entries...</span>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-on-surface-variant p-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 py-8">
                      <span className="material-symbols-outlined text-on-surface-variant/40 text-[48px]">
                        local_shipping
                      </span>
                      <div>
                        <h4 className="text-body-lg text-primary font-bold">
                          No Dispatch Entries Found
                        </h4>
                        <p className="text-body-sm text-on-surface-variant mt-1">
                          Try adjusting your search filters or record a new dispatch entry.
                        </p>
                      </div>
                      <Link
                        href="/dispatch-entries/new"
                        className="bg-secondary-container hover:bg-secondary-container/85 text-on-secondary-container font-body-sm rounded-lg px-4 py-2 font-semibold transition-all duration-200"
                      >
                        Create New Entry
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => router.push(`/dispatch-entries/${entry.id}`)}
                    className={`group cursor-pointer transition-colors hover:bg-[#252525] ${entry.isCancelled ? 'line-through decoration-[#ef4444] opacity-40' : ''}`}
                  >
                    <td className="font-data-tabular text-data-tabular text-primary px-6 py-4 font-semibold">
                      {entry.challanNo}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-body-md text-on-surface font-medium">
                        {entry.customer?.firmName}
                      </span>
                    </td>
                    <td className="text-body-md text-on-surface-variant px-6 py-4">
                      {new Date(entry.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="text-body-md text-on-surface-variant px-6 py-4">
                      {entry.place}
                    </td>
                    <td className="font-data-tabular text-data-tabular text-secondary px-6 py-4 text-right font-medium">
                      {formatINR(entry.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      {entry.isCancelled ? (
                        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 uppercase">
                          Cancelled
                        </span>
                      ) : entry.status === 'BILLED' ? (
                        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400 uppercase">
                          Billed
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 uppercase">
                          Pending Billing
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-on-surface-variant group-hover:text-primary p-1 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
