'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomerFormDrawer, { Customer } from '../_components/CustomerFormDrawer';

type CustomerPrice = {
  id: string;
  productId: string;
  price: string | number;
  isManual: boolean;
  updatedAt: string;
  product: {
    name: string;
    unit: string;
  };
};

type DispatchEntry = {
  id: string;
  challanNo: string;
  date: string;
  status: 'PENDING_BILLING' | 'BILLED';
  totalAmount: string | number;
};

type Invoice = {
  id: string;
  invoiceNo: string;
  date: string;
  totalAmount: string | number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
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

const paymentStatusColor = (status: string) => {
  switch (status) {
    case 'PAID':
      return 'bg-secondary/15 text-secondary';
    case 'PARTIAL':
      return 'bg-orange-400/15 text-orange-400';
    default:
      return 'bg-error/15 text-error';
  }
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [prices, setPrices] = useState<CustomerPrice[]>([]);
  const [dispatchEntries, setDispatchEntries] = useState<DispatchEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [custRes, pricesRes, dispatchRes, invoicesRes] = await Promise.all([
        fetch(`/api/customers/${id}`),
        fetch(`/api/customers/${id}/prices`),
        fetch(`/api/dispatch-entries?customerId=${id}`),
        fetch(`/api/invoices?customerId=${id}`),
      ]);

      const custData = await custRes.json();
      if (!custRes.ok || !custData.data) {
        setError(custData.error?.message || 'Failed to load customer');
        return;
      }
      setCustomer(custData.data);

      const pricesData = await pricesRes.json();
      if (pricesData.data) setPrices(pricesData.data);

      const dispatchData = await dispatchRes.json();
      if (dispatchData.data) setDispatchEntries(dispatchData.data.slice(0, 5));

      const invoicesData = await invoicesRes.json();
      if (invoicesData.data) setInvoices(invoicesData.data.slice(0, 5));
    } catch (err) {
      console.error('Failed to load customer detail', err);
      setError('Failed to load customer detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="text-on-surface-variant flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-secondary animate-spin text-[32px]">
            progress_activity
          </span>
          <span>Loading customer...</span>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-[48px] text-red-400">error</span>
        <p className="text-body-lg text-primary font-bold">{error || 'Customer not found'}</p>
        <button
          onClick={() => router.push('/customers')}
          className="bg-surface-container border-outline-variant text-primary text-body-sm rounded-lg border-[0.5px] px-4 py-2 transition-colors hover:bg-[#252525]"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  const outstanding = Number(customer.outstandingBalance);
  const limit = Number(customer.creditLimit);
  const utilization = limit > 0 ? Math.min((outstanding / limit) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/customers')}
            className="bg-surface-container border-outline-variant flex h-9 w-9 items-center justify-center rounded-lg border-[0.5px] transition-colors hover:bg-[#252525]"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline-md text-headline-md text-primary">{customer.firmName}</h1>
            <p className="text-on-surface-variant text-body-sm mt-0.5">
              {[customer.city, customer.state].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="bg-primary text-on-primary font-body-md flex items-center gap-2 rounded-lg px-5 py-2 font-semibold transition-colors hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Edit Customer
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Negotiated Prices */}
          <div className="bg-surface-container border-outline-variant overflow-hidden rounded-2xl border-[0.5px]">
            <div className="border-outline-variant border-b-[0.5px] p-5">
              <h2 className="font-title-md text-title-md text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">sell</span>
                Negotiated Prices
              </h2>
            </div>
            {prices.length === 0 ? (
              <p className="text-on-surface-variant text-body-sm p-6 text-center">
                No negotiated prices yet. Prices are recorded automatically the first time a product
                is invoiced to this customer.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low border-outline-variant border-b-[0.5px]">
                      <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 tracking-wider uppercase">
                        Product
                      </th>
                      <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 text-right tracking-wider uppercase">
                        Price
                      </th>
                      <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 tracking-wider uppercase">
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-outline-variant/30 divide-y">
                    {prices.map((cp) => (
                      <tr key={cp.id} className="transition-colors hover:bg-[#222]">
                        <td className="text-body-md text-primary px-5 py-3 font-medium">
                          {cp.product.name}
                        </td>
                        <td className="font-data-tabular text-primary px-5 py-3 text-right">
                          {formatINR(cp.price)} / {cp.product.unit}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                              cp.isManual
                                ? 'bg-secondary/15 text-secondary'
                                : 'bg-surface-variant text-on-surface-variant'
                            }`}
                          >
                            {cp.isManual ? 'Manual' : 'Auto'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Dispatch Entries */}
          <div className="bg-surface-container border-outline-variant overflow-hidden rounded-2xl border-[0.5px]">
            <div className="border-outline-variant flex items-center justify-between border-b-[0.5px] p-5">
              <h2 className="font-title-md text-title-md text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">local_shipping</span>
                Recent Dispatch Entries
              </h2>
              <Link
                href={`/dispatch-entries`}
                className="text-secondary hover:text-primary text-[13px] font-medium transition-colors"
              >
                View All
              </Link>
            </div>
            {dispatchEntries.length === 0 ? (
              <p className="text-on-surface-variant text-body-sm p-6 text-center">
                No dispatch entries yet.
              </p>
            ) : (
              <div className="divide-outline-variant/30 divide-y">
                {dispatchEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => router.push(`/dispatch-entries/${entry.id}`)}
                    className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-[#222]"
                  >
                    <div>
                      <p className="text-body-md text-primary font-semibold">
                        Challan #{entry.challanNo}
                      </p>
                      <p className="text-on-surface-variant text-[12px]">
                        {formatDate(entry.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-data-tabular text-primary font-semibold">
                        {formatINR(entry.totalAmount)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                          entry.status === 'BILLED'
                            ? 'bg-secondary/15 text-secondary'
                            : 'bg-amber-400/15 text-amber-400'
                        }`}
                      >
                        {entry.status === 'BILLED' ? 'Billed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Invoices */}
          <div className="bg-surface-container border-outline-variant overflow-hidden rounded-2xl border-[0.5px]">
            <div className="border-outline-variant flex items-center justify-between border-b-[0.5px] p-5">
              <h2 className="font-title-md text-title-md text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">receipt_long</span>
                Recent Invoices
              </h2>
              <Link
                href={`/invoices`}
                className="text-secondary hover:text-primary text-[13px] font-medium transition-colors"
              >
                View All
              </Link>
            </div>
            {invoices.length === 0 ? (
              <p className="text-on-surface-variant text-body-sm p-6 text-center">
                No invoices yet.
              </p>
            ) : (
              <div className="divide-outline-variant/30 divide-y">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                    className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-[#222]"
                  >
                    <div>
                      <p className="font-data-tabular text-primary font-semibold">
                        {invoice.invoiceNo}
                      </p>
                      <p className="text-on-surface-variant text-[12px]">
                        {formatDate(invoice.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-data-tabular text-primary font-semibold">
                        {formatINR(invoice.totalAmount)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${paymentStatusColor(invoice.paymentStatus)}`}
                      >
                        {invoice.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Profile */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-5">Profile</h2>
            <div className="space-y-4 text-[13px]">
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">person</span>
                <span className="text-primary">{customer.contactPerson || 'N/A'}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">call</span>
                <span className="text-primary">{customer.phone || 'N/A'}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span className="text-primary">{customer.email || 'N/A'}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                <span className="text-primary">{customer.address || 'N/A'}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span className="text-primary font-mono">{customer.gstin || 'Unregistered'}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-5">Financials</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-on-surface-variant">Outstanding Balance</span>
                <span className="font-data-tabular font-semibold text-amber-400">
                  {formatINR(outstanding)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-on-surface-variant">Credit Limit</span>
                <span className="font-data-tabular text-primary">{formatINR(limit)}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#222]">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    outstanding > limit && limit > 0 ? 'bg-error' : 'bg-secondary'
                  }`}
                  style={{ width: `${utilization}%` }}
                ></div>
              </div>
              {outstanding > limit && limit > 0 && (
                <p className="text-error text-[12px]">Outstanding balance exceeds credit limit.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <CustomerFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchData}
        editingCustomer={customer}
      />
    </div>
  );
}
