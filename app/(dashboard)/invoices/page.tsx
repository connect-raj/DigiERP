'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

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
  paidAmount: string | number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
};

type Customer = { id: string; firmName: string };

const PAGE_SIZE = 20;

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

const paymentStatusColor = (status: string) => {
  switch (status) {
    case 'PAID':
      return 'bg-secondary/15 text-secondary border-secondary/30';
    case 'PARTIAL':
      return 'bg-orange-400/15 text-orange-400 border-orange-400/30';
    default:
      return 'bg-error/15 text-error border-error/30';
  }
};

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch('/api/customers')
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

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) setInvoices(data.data);
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    fetchInvoices();
  }, [search, customerFilter, statusFilter, fromDate, toDate]);

  const stats = useMemo(() => {
    let totalInvoiced = 0;
    let outstanding = 0;
    let paid = 0;
    let pendingCount = 0;

    invoices.forEach((inv) => {
      const total = Number(inv.totalAmount);
      const paidAmt = Number(inv.paidAmount);
      totalInvoiced += total;
      paid += paidAmt;
      if (inv.paymentStatus !== 'PAID') {
        outstanding += total - paidAmt;
        pendingCount += 1;
      }
    });

    return { totalInvoiced, outstanding, paid, pendingCount };
  }, [invoices]);

  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const paginated = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-[280px]">
            <span className="material-symbols-outlined text-on-surface-variant absolute top-1/2 left-3 -translate-y-1/2 text-[20px]">
              search
            </span>
            <input
              className="bg-surface-container-lowest border-outline-variant text-body-md focus:border-primary w-full rounded border-[0.5px] px-10 py-2 transition-colors focus:outline-none"
              placeholder="Search invoice no..."
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
            {['ALL', 'UNPAID', 'PARTIAL', 'PAID'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-label-caps border-outline-variant border-r-[0.5px] px-3 py-2 uppercase transition-colors last:border-r-0 ${
                  statusFilter === status
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                {status}
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
          onClick={() => router.push('/invoices/new')}
          className="bg-primary text-on-primary flex items-center justify-center gap-2 rounded px-6 py-2.5 font-bold shadow-lg transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Create Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="bg-surface-container-low border-outline-variant border-[0.5px] p-5">
          <p className="text-label-caps text-on-surface-variant mb-1">Total Invoiced</p>
          <p className="font-display text-headline-md text-primary">
            {formatINR(stats.totalInvoiced)}
          </p>
        </div>
        <div className="bg-surface-container-low border-outline-variant border-[0.5px] p-5">
          <p className="text-label-caps text-on-surface-variant mb-1">Outstanding</p>
          <p className="font-display text-headline-md text-error">{formatINR(stats.outstanding)}</p>
        </div>
        <div className="bg-surface-container-low border-outline-variant border-[0.5px] p-5">
          <p className="text-label-caps text-on-surface-variant mb-1">Paid</p>
          <p className="font-display text-headline-md text-secondary">{formatINR(stats.paid)}</p>
        </div>
        <div className="bg-surface-container-low border-outline-variant border-[0.5px] p-5">
          <p className="text-label-caps text-on-surface-variant mb-1">Pending Invoices</p>
          <p className="font-display text-headline-md text-primary">{stats.pendingCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container border-outline-variant flex flex-1 flex-col overflow-hidden rounded-lg border-[0.5px]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-high text-label-caps text-on-surface-variant border-outline-variant border-b-[0.5px] tracking-widest uppercase">
                <th className="px-6 py-4 font-bold">Invoice No</th>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Customer</th>
                <th className="px-6 py-4 text-right font-bold">CGST</th>
                <th className="px-6 py-4 text-right font-bold">SGST</th>
                <th className="px-6 py-4 text-right font-bold">IGST</th>
                <th className="px-6 py-4 text-right font-bold">Total Amount</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-outline-variant text-data-tabular divide-y-[0.5px]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="bg-surface-variant h-4 w-full max-w-[100px] animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[40px]">
                        receipt_long
                      </span>
                      <p className="text-body-md text-on-surface-variant">No invoices found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((invoice) => (
                  <tr key={invoice.id} className="bg-surface transition-colors hover:bg-[#1e1e1e]">
                    <td className="text-primary px-6 py-4 font-mono">{invoice.invoiceNo}</td>
                    <td className="text-on-surface-variant px-6 py-4">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/customers/${invoice.customer.id}`)}
                        className="text-secondary transition-all hover:underline"
                      >
                        {invoice.customer.firmName}
                      </button>
                    </td>
                    <td className="text-on-surface-variant px-6 py-4 text-right">
                      {Number(invoice.totalCgst) > 0 ? formatINR(invoice.totalCgst) : '—'}
                    </td>
                    <td className="text-on-surface-variant px-6 py-4 text-right">
                      {Number(invoice.totalSgst) > 0 ? formatINR(invoice.totalSgst) : '—'}
                    </td>
                    <td className="text-on-surface-variant px-6 py-4 text-right">
                      {Number(invoice.totalIgst) > 0 ? formatINR(invoice.totalIgst) : '—'}
                    </td>
                    <td className="text-primary px-6 py-4 text-right font-bold">
                      {formatINR(invoice.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full border-[0.5px] px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase ${paymentStatusColor(invoice.paymentStatus)}`}
                      >
                        {invoice.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => router.push(`/invoices/${invoice.id}`)}
                          className="text-on-surface-variant hover:text-primary transition-colors"
                          title="View Detail"
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <a
                          href={`/api/invoices/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-on-surface-variant hover:text-primary transition-colors"
                          title="Download PDF"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            picture_as_pdf
                          </span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && invoices.length > 0 && (
          <footer className="border-outline-variant bg-surface-container-high mt-auto flex items-center justify-between border-t-[0.5px] px-6 py-4">
            <span className="text-body-md text-on-surface-variant">
              Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, invoices.length)} of{' '}
              {invoices.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-outline-variant text-on-surface-variant rounded border-[0.5px] p-2 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <span className="text-body-md text-on-surface-variant px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="border-outline-variant text-on-surface-variant rounded border-[0.5px] p-2 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
