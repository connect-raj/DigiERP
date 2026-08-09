'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomerFormDrawer, { Customer } from '../_components/CustomerFormDrawer';
import RecordPaymentModal from '../../payments/_components/RecordPaymentModal';
import AllocatePaymentsModal from '../../payments/_components/AllocatePaymentsModal';
import { RegistrationMark } from '@/components/ui/RegistrationMark';
import { DetailCard } from '@/components/ui/DetailCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill, type Status } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/button';

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

type PriceHistoryRow = {
  id: string;
  productId: string;
  price: string | number;
  source: string;
  recordedAt: string;
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

type Payment = {
  id: string;
  amount: string | number;
  onAccount: string | number;
  mode: string;
  reference: string | null;
  status?: 'ACTIVE' | 'VOID';
  date: string;
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

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [prices, setPrices] = useState<CustomerPrice[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRow[]>([]);
  const [dispatchEntries, setDispatchEntries] = useState<DispatchEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);

  const [products, setProducts] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [addingPrice, setAddingPrice] = useState(false);
  const [newPriceProductId, setNewPriceProductId] = useState('');

  const [savingBillingMode, setSavingBillingMode] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState('');
  const [openingBalanceDate, setOpeningBalanceDate] = useState('');
  const [savingOpeningBalance, setSavingOpeningBalance] = useState(false);

  const updateBillingMode = async (mode: 'BILL_WISE' | 'OPEN_BALANCE') => {
    try {
      setSavingBillingMode(true);
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingMode: mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error?.message ?? 'Failed to update billing mode');
        return;
      }
      fetchData();
    } catch (err) {
      console.error('Failed to update billing mode', err);
      window.alert('Failed to update billing mode');
    } finally {
      setSavingBillingMode(false);
    }
  };

  const saveOpeningBalance = async () => {
    const parsed = Number(openingBalanceInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      window.alert('Enter a valid non-negative opening balance.');
      return;
    }
    if (!openingBalanceDate) {
      window.alert('Pick an as-of date for the opening balance.');
      return;
    }
    try {
      setSavingOpeningBalance(true);
      const res = await fetch(`/api/customers/${id}/opening-balance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalAmount: parsed,
          asOfDate: new Date(openingBalanceDate).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error?.message ?? 'Failed to set opening balance');
        return;
      }
      setOpeningBalanceInput('');
      setOpeningBalanceDate('');
      fetchData();
    } catch (err) {
      console.error('Failed to set opening balance', err);
      window.alert('Failed to set opening balance');
    } finally {
      setSavingOpeningBalance(false);
    }
  };

  const savePrice = async (productId: string) => {
    const parsed = Number(priceInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      window.alert('Enter a valid non-negative price.');
      return;
    }
    try {
      setSavingPrice(true);
      const res = await fetch(`/api/customers/${id}/prices/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error?.message ?? 'Failed to save price');
        return;
      }
      setEditingProductId(null);
      setAddingPrice(false);
      setNewPriceProductId('');
      setPriceInput('');
      fetchData();
    } catch (err) {
      console.error('Failed to save price', err);
      window.alert('Failed to save price');
    } finally {
      setSavingPrice(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [custRes, pricesRes, historyRes, dispatchRes, invoicesRes, paymentsRes] =
        await Promise.all([
          fetch(`/api/customers/${id}`),
          fetch(`/api/customers/${id}/prices`),
          fetch(`/api/customers/${id}/price-history`),
          // Only the 5 most recent are shown below; default page-1 (10, date-desc) already covers that.
          fetch(`/api/dispatch-entries?customerId=${id}`),
          fetch(`/api/invoices?customerId=${id}`),
          fetch(`/api/customers/${id}/payments`),
        ]);

      // The customer record is required; if it fails, surface the error.
      const custData = custRes.ok ? await custRes.json() : null;
      if (!custData?.data) {
        setError(custData?.error?.message || 'Failed to load customer');
        return;
      }
      setCustomer(custData.data);

      // Secondary sections degrade gracefully — a non-OK/non-JSON response for
      // any of them must not crash the whole page.
      if (pricesRes.ok) {
        const pricesData = await pricesRes.json();
        if (pricesData.data) setPrices(pricesData.data);
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (historyData.data) setPriceHistory(historyData.data.slice(0, 10));
      }
      if (dispatchRes.ok) {
        const dispatchData = await dispatchRes.json();
        if (dispatchData.data) setDispatchEntries(dispatchData.data.slice(0, 5));
      }
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        if (invoicesData.data) setInvoices(invoicesData.data.slice(0, 5));
      }
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        if (paymentsData.data) setPayments(paymentsData.data.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load customer detail', err);
      setError('Failed to load customer detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // Product picker for setting a manual price needs the full list, not a page.
    fetch('/api/products?limit=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setProducts(
            data.data.map((p: { id: string; name: string; unit: string }) => ({
              id: p.id,
              name: p.name,
              unit: p.unit,
            }))
          );
        }
      })
      .catch((err) => console.error('Failed to fetch products', err));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <RegistrationMark size="lg" spinning />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-status-error text-[48px]">error</span>
        <p className="text-on-surface font-semibold">{error || 'Customer not found'}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/customers')}>
          Back to Customers
        </Button>
      </div>
    );
  }

  // pendingTotal is derived: positive = owed by customer, negative = on-account credit
  const pendingTotal = Number(customer.pendingTotal ?? 0);
  const outstanding = Math.max(0, pendingTotal);
  const creditBalance = Math.max(0, -pendingTotal);
  const limit = Number(customer.creditLimit);
  const utilization = limit > 0 ? Math.min((outstanding / limit) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/customers')}>
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Button>
          <div>
            <h1 className="font-display text-on-surface text-xl font-semibold tracking-tight">
              {customer.firmName}
            </h1>
            <p className="text-on-surface-variant mt-0.5 text-sm">
              {[customer.city, customer.state].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/customers/${id}/ledger`}>
              <span className="material-symbols-outlined text-[18px]">description</span>
              Statement
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsAllocateModalOpen(true)}>
            <span className="material-symbols-outlined text-[18px]">sync_alt</span>
            Allocate Payments
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsRecordModalOpen(true)}>
            <span className="material-symbols-outlined text-[18px]">payments</span>
            Record Payment
          </Button>
          <Button size="sm" onClick={() => setIsDrawerOpen(true)}>
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit Customer
          </Button>
        </div>
      </div>

      {/* Smart-buttons: live stats linking to filtered lists */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/invoices?customerId=${id}`}
          className="border-border bg-surface-container-low hover:bg-surface-container flex min-w-[140px] flex-col rounded-xl border px-4 py-3 transition-colors"
        >
          <span className="text-on-surface-variant text-[11px] font-medium tracking-widest uppercase">
            Open Invoices
          </span>
          <span className="text-on-surface font-mono text-lg font-semibold">
            {invoices.filter((i) => i.paymentStatus !== 'PAID').length}
          </span>
        </Link>
        <Link
          href={`/customers/${id}/ledger`}
          className="border-border bg-surface-container-low hover:bg-surface-container flex min-w-[140px] flex-col rounded-xl border px-4 py-3 transition-colors"
        >
          <span className="text-on-surface-variant text-[11px] font-medium tracking-widest uppercase">
            Outstanding
          </span>
          <span className="text-status-error font-mono text-lg font-semibold">
            {formatINR(outstanding)}
          </span>
        </Link>
        {creditBalance > 0 && (
          <Link
            href={`/customers/${id}/ledger`}
            className="border-border bg-surface-container-low hover:bg-surface-container flex min-w-[140px] flex-col rounded-xl border px-4 py-3 transition-colors"
          >
            <span className="text-on-surface-variant text-[11px] font-medium tracking-widest uppercase">
              On Account
            </span>
            <span className="text-accent-yellow font-mono text-lg font-semibold">
              {formatINR(creditBalance)}
            </span>
          </Link>
        )}
        <Link
          href={`/payments?customerId=${id}`}
          className="border-border bg-surface-container-low hover:bg-surface-container flex min-w-[140px] flex-col rounded-xl border px-4 py-3 transition-colors"
        >
          <span className="text-on-surface-variant text-[11px] font-medium tracking-widest uppercase">
            Payments
          </span>
          <span className="text-on-surface font-mono text-lg font-semibold">{payments.length}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Negotiated Prices */}
          <DetailCard
            title="Negotiated Prices"
            contentClassName="p-0"
            headerAside={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddingPrice((v) => !v);
                  setNewPriceProductId('');
                  setPriceInput('');
                  setEditingProductId(null);
                }}
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Set Manual Price
              </Button>
            }
          >
            {addingPrice && (
              <div className="border-border bg-surface-container-low flex flex-wrap items-center gap-3 border-b p-4">
                <select
                  value={newPriceProductId}
                  onChange={(e) => setNewPriceProductId(e.target.value)}
                  className="bg-surface-container-lowest border-border text-on-surface focus:border-ring rounded-lg border px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="Price"
                  className="bg-surface-container-lowest border-border text-on-surface focus:border-ring w-32 rounded-lg border px-3 py-2 text-sm focus:outline-none"
                />
                <Button
                  size="sm"
                  disabled={!newPriceProductId || savingPrice}
                  onClick={() => savePrice(newPriceProductId)}
                >
                  {savingPrice ? 'Saving…' : 'Save'}
                </Button>
              </div>
            )}

            {prices.length === 0 && !addingPrice ? (
              <EmptyState
                icon={<span className="material-symbols-outlined text-[40px]">sell</span>}
                title="No negotiated prices yet"
                description="Prices are recorded automatically the first time a product is invoiced to this customer, or set one manually above."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-surface-container-high text-on-surface-variant border-border border-b text-[11px] font-medium tracking-widest uppercase">
                      <th className="px-5 py-3">Product</th>
                      <th className="px-5 py-3 text-right">Price</th>
                      <th className="px-5 py-3">Source</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {prices.map((cp) => (
                      <tr key={cp.id} className="hover:bg-surface-container transition-colors">
                        <td className="text-on-surface px-5 py-3 font-medium">{cp.product.name}</td>
                        <td className="text-on-surface px-5 py-3 text-right font-mono">
                          {editingProductId === cp.productId ? (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={priceInput}
                              onChange={(e) => setPriceInput(e.target.value)}
                              className="bg-surface-container-lowest border-border focus:border-ring w-28 rounded-lg border px-2 py-1 text-right focus:outline-none"
                            />
                          ) : (
                            <>
                              {formatINR(cp.price)} / {cp.product.unit}
                            </>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                              cp.isManual
                                ? 'bg-accent-cyan/15 text-accent-cyan'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {cp.isManual ? 'Manual' : 'Auto'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {editingProductId === cp.productId ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled={savingPrice}
                                onClick={() => savePrice(cp.productId)}
                                className="text-accent-cyan text-[13px] font-semibold disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingProductId(null)}
                                className="text-on-surface-variant text-[13px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingProductId(cp.productId);
                                setAddingPrice(false);
                                setPriceInput(String(Number(cp.price)));
                              }}
                              className="text-on-surface-variant hover:text-on-surface rounded p-1"
                              title="Edit price"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>

          {/* Price History */}
          <DetailCard title="Price History" contentClassName="p-0">
            {priceHistory.length === 0 ? (
              <EmptyState
                icon={<span className="material-symbols-outlined text-[40px]">history</span>}
                title="No price changes yet"
                description="Manual and auto-recorded price updates will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-surface-container-high text-on-surface-variant border-border border-b text-[11px] font-medium tracking-widest uppercase">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Product</th>
                      <th className="px-5 py-3 text-right">Price</th>
                      <th className="px-5 py-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {priceHistory.map((row) => (
                      <tr key={row.id} className="hover:bg-surface-container transition-colors">
                        <td className="text-on-surface-variant px-5 py-3 text-[13px]">
                          {formatDate(row.recordedAt)}
                        </td>
                        <td className="text-on-surface px-5 py-3 font-medium">
                          {row.product.name}
                        </td>
                        <td className="text-on-surface px-5 py-3 text-right font-mono">
                          {formatINR(row.price)} / {row.product.unit}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                              row.source === 'MANUAL'
                                ? 'bg-accent-cyan/15 text-accent-cyan'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {row.source.replace('AUTO_INVOICE', 'Auto').replace('MANUAL', 'Manual')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>

          {/* Recent Dispatch Entries */}
          <DetailCard
            title="Recent Dispatch Entries"
            contentClassName="p-0"
            headerAside={
              <Link
                href={`/dispatch-entries?customerId=${id}`}
                className="text-accent-cyan hover:text-on-surface text-[13px] font-medium transition-colors"
              >
                View All
              </Link>
            }
          >
            {dispatchEntries.length === 0 ? (
              <EmptyState
                icon={<span className="material-symbols-outlined text-[40px]">local_shipping</span>}
                title="No dispatch entries yet"
              />
            ) : (
              <div className="divide-border divide-y">
                {dispatchEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => router.push(`/dispatch-entries/${entry.id}`)}
                    className="hover:bg-surface-container flex cursor-pointer items-center justify-between p-4 transition-colors"
                  >
                    <div>
                      <p className="text-on-surface font-semibold">Challan #{entry.challanNo}</p>
                      <p className="text-on-surface-variant text-[12px]">
                        {formatDate(entry.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-on-surface font-mono font-semibold">
                        {formatINR(entry.totalAmount)}
                      </span>
                      <StatusPill status={entry.status === 'BILLED' ? 'INVOICED' : 'DISPATCHED'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>

          {/* Recent Invoices */}
          <DetailCard
            title="Recent Invoices"
            contentClassName="p-0"
            headerAside={
              <Link
                href={`/invoices?customerId=${id}`}
                className="text-accent-cyan hover:text-on-surface text-[13px] font-medium transition-colors"
              >
                View All
              </Link>
            }
          >
            {invoices.length === 0 ? (
              <EmptyState
                icon={<span className="material-symbols-outlined text-[40px]">receipt_long</span>}
                title="No invoices yet"
              />
            ) : (
              <div className="divide-border divide-y">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                    className="hover:bg-surface-container flex cursor-pointer items-center justify-between p-4 transition-colors"
                  >
                    <div>
                      <p className="text-on-surface font-mono font-semibold">{invoice.invoiceNo}</p>
                      <p className="text-on-surface-variant text-[12px]">
                        {formatDate(invoice.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-on-surface font-mono font-semibold">
                        {formatINR(invoice.totalAmount)}
                      </span>
                      <StatusPill status={invoice.paymentStatus as Status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>

          {/* Recent Payments */}
          <DetailCard
            title="Recent Payments"
            contentClassName="p-0"
            headerAside={
              <Link
                href={`/payments?customerId=${id}`}
                className="text-accent-cyan hover:text-on-surface text-[13px] font-medium transition-colors"
              >
                View All
              </Link>
            }
          >
            {payments.length === 0 ? (
              <EmptyState
                icon={<span className="material-symbols-outlined text-[40px]">payments</span>}
                title="No payments yet"
              />
            ) : (
              <div className="divide-border divide-y">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    onClick={() => router.push(`/payments/${payment.id}`)}
                    className="hover:bg-surface-container flex cursor-pointer items-center justify-between p-4 transition-colors"
                  >
                    <div>
                      <p className="text-on-surface font-semibold">
                        {payment.mode.replace('_', ' ')}
                      </p>
                      <p className="text-on-surface-variant text-[12px]">
                        {formatDate(payment.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-on-surface font-mono font-semibold">
                        {formatINR(payment.amount)}
                      </span>
                      {Number(payment.onAccount) > 0 && (
                        <span className="bg-status-warning/15 text-status-warning rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase">
                          {formatINR(payment.onAccount)} on account
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>
        </div>

        {/* Right Column - Profile */}
        <div className="flex flex-col gap-6">
          <DetailCard title="Profile">
            <div className="space-y-4 text-[13px]">
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">person</span>
                <span className="text-on-surface">{customer.contactPerson || 'N/A'}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">call</span>
                <span className="text-on-surface">{customer.phone || 'N/A'}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span className="text-on-surface">{customer.email || 'N/A'}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                <span className="text-on-surface">{customer.address || 'N/A'}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span className="text-on-surface font-mono">
                  {customer.gstin || 'Unregistered'}
                </span>
              </div>
            </div>
          </DetailCard>

          <DetailCard title="Financials">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-on-surface-variant">Outstanding Balance</span>
                <span className="text-status-warning font-mono font-semibold">
                  {formatINR(outstanding)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-on-surface-variant">On-Account Credit</span>
                <span className="text-accent-cyan font-mono font-semibold">
                  {formatINR(creditBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-on-surface-variant">Credit Limit</span>
                <span className="text-on-surface font-mono">{formatINR(limit)}</span>
              </div>
              <div className="bg-surface-container-highest mt-2 h-2 w-full overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    outstanding > limit && limit > 0 ? 'bg-status-error' : 'bg-status-success'
                  }`}
                  style={{ width: `${utilization}%` }}
                ></div>
              </div>
              {outstanding > limit && limit > 0 && (
                <p className="text-status-error text-[12px]">
                  Outstanding balance exceeds credit limit.
                </p>
              )}
            </div>
          </DetailCard>

          {/* Billing Mode & Opening Balance */}
          <DetailCard title="Billing">
            <div className="mb-5">
              <p className="text-on-surface-variant mb-2 text-[13px]">Billing Mode</p>
              <div className="border-border flex overflow-hidden rounded-lg border">
                {(['BILL_WISE', 'OPEN_BALANCE'] as const).map((mode) => {
                  const active = (customer.billingMode ?? 'BILL_WISE') === mode;
                  return (
                    <button
                      key={mode}
                      disabled={savingBillingMode || active}
                      onClick={() => updateBillingMode(mode)}
                      className={`flex-1 px-3 py-2 text-[12px] font-semibold transition-colors ${
                        active
                          ? 'bg-accent-cyan text-on-secondary'
                          : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {mode === 'BILL_WISE' ? 'Bill-wise' : 'Open Balance'}
                    </button>
                  );
                })}
              </div>
              <p className="text-on-surface-variant mt-2 text-[11px]">
                Controls the default payment-entry view only. Balances are computed the same way for
                both modes.
              </p>
            </div>

            <div>
              <p className="text-on-surface-variant mb-2 text-[13px]">Set Opening Balance</p>
              <div className="flex flex-col gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(e.target.value)}
                  placeholder="Amount (e.g. historical pending)"
                  className="bg-surface-container-lowest border-border text-on-surface focus:border-ring rounded-lg border px-3 py-2 text-sm focus:outline-none"
                />
                <input
                  type="date"
                  value={openingBalanceDate}
                  onChange={(e) => setOpeningBalanceDate(e.target.value)}
                  className="bg-surface-container-lowest border-border text-on-surface focus:border-ring rounded-lg border px-3 py-2 text-sm focus:outline-none"
                />
                <Button disabled={savingOpeningBalance} onClick={saveOpeningBalance}>
                  {savingOpeningBalance ? 'Saving…' : 'Save Opening Balance'}
                </Button>
              </div>
              <p className="text-on-surface-variant mt-2 text-[11px]">
                One-time entry for pending balance carried over from before this system. Editable
                later; folds into the running balance.
              </p>
            </div>
          </DetailCard>
        </div>
      </div>

      <CustomerFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchData}
        editingCustomer={customer}
      />

      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={fetchData}
        lockedCustomerId={customer.id}
        lockedCustomerName={customer.firmName}
      />

      <AllocatePaymentsModal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        onSuccess={fetchData}
        customerId={customer.id}
        customerName={customer.firmName}
      />
    </div>
  );
}
