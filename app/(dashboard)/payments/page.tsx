'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RecordPaymentModal from './_components/RecordPaymentModal';
import Pagination from '@/components/ui/Pagination';

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
  const [customerFilter, setCustomerFilter] = useState('All');
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
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-[280px]">
            <span className="material-symbols-outlined text-on-surface-variant absolute top-1/2 left-3 -translate-y-1/2 text-[20px]">
              search
            </span>
            <input
              className="bg-surface-container-lowest border-outline-variant text-body-md focus:border-primary w-full rounded border-[0.5px] px-10 py-2 transition-colors focus:outline-none"
              placeholder="Search reference..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="bg-surface-container-lowest border-outline-variant text-body-md text-on-surface-variant cursor-pointer rounded border-[0.5px] px-3 py-2 focus:outline-none"
          >
            <option value="All">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firmName}
              </option>
            ))}
          </select>
          <div className="border-outline-variant flex overflow-hidden rounded border-[0.5px]">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                className={`text-label-caps border-outline-variant border-r-[0.5px] px-3 py-2 uppercase transition-colors last:border-r-0 ${
                  modeFilter === m
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                {m.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="bg-surface-container-lowest border-outline-variant flex items-center gap-2 rounded border-[0.5px] px-3 py-2">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
              calendar_today
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-body-md text-on-surface w-32 border-none bg-transparent p-0 focus:ring-0"
            />
            <span className="text-on-surface-variant">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-body-md text-on-surface w-32 border-none bg-transparent p-0 focus:ring-0"
            />
          </div>
        </div>
        <button
          onClick={() => setIsRecordModalOpen(true)}
          className="bg-primary text-on-primary flex items-center justify-center gap-2 rounded px-6 py-2.5 font-bold shadow-lg transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Record Payment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="bg-surface-container-low border-outline-variant border-[0.5px] p-5">
          <p className="text-label-caps text-on-surface-variant mb-1">Total Received</p>
          <p className="font-display text-headline-md text-primary">
            {formatINR(stats.totalReceived)}
          </p>
        </div>
        <div className="bg-surface-container-low border-outline-variant border-[0.5px] p-5">
          <p className="text-label-caps text-on-surface-variant mb-1">Allocated</p>
          <p className="font-display text-headline-md text-secondary">
            {formatINR(stats.totalAllocated)}
          </p>
        </div>
        <div className="bg-surface-container-low border-outline-variant border-[0.5px] p-5">
          <p className="text-label-caps text-on-surface-variant mb-1">Available Credit</p>
          <p className="font-display text-headline-md text-amber-400">
            {formatINR(stats.totalUnallocated)}
          </p>
        </div>
        <div className="bg-surface-container-low border-outline-variant border-[0.5px] p-5">
          <p className="text-label-caps text-on-surface-variant mb-1">Payments</p>
          <p className="font-display text-headline-md text-primary">{stats.count}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container border-outline-variant flex flex-1 flex-col overflow-hidden rounded-lg border-[0.5px]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-high text-label-caps text-on-surface-variant border-outline-variant border-b-[0.5px] tracking-widest uppercase">
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Customer</th>
                <th className="px-6 py-4 text-right font-bold">Amount</th>
                <th className="px-6 py-4 font-bold">Mode</th>
                <th className="px-6 py-4 font-bold">Reference</th>
                <th className="px-6 py-4 text-right font-bold">On Account</th>
                <th className="px-6 py-4 font-bold">Recorded By</th>
                <th className="px-6 py-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-outline-variant text-data-tabular divide-y-[0.5px]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="bg-surface-variant h-4 w-full max-w-[100px] animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pagination.total === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[40px]">
                        payments
                      </span>
                      <p className="text-body-md text-on-surface-variant">No payments found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="bg-surface transition-colors hover:bg-[#1e1e1e]">
                    <td className="text-on-surface-variant px-6 py-4">
                      {formatDate(payment.date)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/customers/${payment.customer.id}`)}
                        className="text-secondary transition-all hover:underline"
                      >
                        {payment.customer.firmName}
                      </button>
                    </td>
                    <td className="text-primary px-6 py-4 text-right font-bold">
                      {formatINR(payment.amount)}
                    </td>
                    <td className="text-on-surface-variant px-6 py-4">
                      {payment.mode.replace('_', ' ')}
                    </td>
                    <td className="text-on-surface-variant px-6 py-4">
                      {payment.reference || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={
                          Number(payment.onAccount) > 0
                            ? 'font-semibold text-amber-400'
                            : 'text-on-surface-variant'
                        }
                      >
                        {formatINR(payment.onAccount)}
                      </span>
                    </td>
                    <td className="text-on-surface-variant px-6 py-4">
                      {payment.recordedBy?.username || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => router.push(`/payments/${payment.id}`)}
                        className="text-on-surface-variant hover:text-primary transition-colors"
                        title="View Detail"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))
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

      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={fetchPayments}
      />
    </div>
  );
}
