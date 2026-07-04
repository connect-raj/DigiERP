'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

type StockTransaction = {
  id: string;
  productId: string;
  changeQty: string | number;
  stockBefore: string | number;
  stockAfter: string | number;
  reason: string;
  createdAt: string;
  product: {
    name: string;
  };
};

type DispatchEntryItem = {
  id: string;
  productId: string;
  quantity: string | number;
  price: string | number;
  cgst: string | number;
  sgst: string | number;
  igst: string | number;
  lineTotal: string | number;
  product: {
    name: string;
    category: {
      name: string;
      gstRate: string | number;
    };
  };
};

type DispatchEntry = {
  id: string;
  challanNo: string;
  customerId: string;
  place: string;
  transport?: string | null;
  date: string;
  entryDate: string;
  status: 'PENDING_BILLING' | 'BILLED';
  isCancelled: boolean;
  totalAmount: string | number;
  totalCgst: string | number;
  totalSgst: string | number;
  totalIgst: string | number;
  customer: {
    id: string;
    firmName: string;
    state: string;
    gstin?: string | null;
  };
  items: DispatchEntryItem[];
  invoice?: {
    id: string;
    invoiceNo: string;
    date: string;
    paymentStatus: string;
  } | null;
  stockTransactions?: StockTransaction[];
};

export default function DispatchEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [entry, setEntry] = useState<DispatchEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion state
  const [isStockImpactOpen, setIsStockImpactOpen] = useState(true);

  // Cancel Dialog Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dispatch-entries/${id}`);
      const data = await res.json();
      if (!res.ok || !data.data) {
        setError(data.error?.message || 'Failed to fetch dispatch entry details');
      } else {
        setEntry(data.data);
      }
    } catch (err) {
      console.error('Failed to load dispatch details', err);
      setError('Failed to load dispatch entry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    fetchDetails();
  }, [id]);

  const handleCancelEntry = async () => {
    try {
      setCancelling(true);
      const res = await fetch(`/api/dispatch-entries/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error?.message || 'Failed to cancel dispatch entry');
      } else {
        setIsCancelModalOpen(false);
        fetchDetails(); // Reload data to show updated state
      }
    } catch (err) {
      console.error('Error cancelling entry', err);
      alert('An unexpected error occurred.');
    } finally {
      setCancelling(false);
    }
  };

  const handleGenerateInvoice = async () => {
    // Generate Invoice handler (Mock / placeholder behavior)
    alert('Invoice generation triggered. Generating invoice for Challan ' + entry?.challanNo);
  };

  // Indian format helper for currency
  const formatINR = (val: string | number) => {
    const num = Number(val);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="text-on-surface-variant flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-secondary animate-spin text-[32px]">
            progress_activity
          </span>
          <span>Loading dispatch entry details...</span>
        </div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-[48px] text-red-400">error</span>
        <div>
          <h3 className="text-body-lg text-primary font-bold">Error Loading Dispatch Entry</h3>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {error || 'Dispatch entry not found'}
          </p>
        </div>
        <button
          onClick={() => router.push('/dispatch-entries')}
          className="bg-surface-container border-outline-variant text-primary text-body-sm rounded-lg border-[0.5px] px-4 py-2 transition-colors hover:bg-[#252525]"
        >
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Header / Actions */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dispatch-entries')}
            className="bg-surface-container border-outline-variant flex h-9 w-9 items-center justify-center rounded-lg border-[0.5px] transition-colors hover:bg-[#252525]"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-headline-md text-headline-md text-primary">
                Challan #{entry.challanNo}
              </h1>
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
            </div>
            <p className="text-on-surface-variant text-body-sm mt-0.5">
              Recorded on{' '}
              {new Date(entry.entryDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {!entry.isCancelled && (
          <div className="flex items-center gap-3">
            {entry.status === 'PENDING_BILLING' ? (
              <>
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="text-body-sm rounded-lg border border-red-500/30 px-4 py-2 font-semibold text-red-400 transition-colors hover:bg-red-500/10 active:scale-95"
                >
                  Cancel Entry
                </button>
                <button
                  onClick={handleGenerateInvoice}
                  className="bg-secondary-container hover:bg-secondary-container/85 text-on-secondary-container text-body-sm rounded-lg px-4 py-2 font-semibold transition-colors active:scale-95"
                >
                  Generate Invoice
                </button>
              </>
            ) : (
              <span className="text-body-sm text-on-surface-variant">
                No modifications allowed (Invoiced)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Invoice Card Link if Billed */}
      {entry.status === 'BILLED' && entry.invoice && (
        <div className="border-outline-variant flex items-center justify-between rounded-r-xl border-[0.5px] border-l-4 border-green-500 border-l-green-500 bg-[#1e1e1e] p-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-green-400">
              receipt_long
            </span>
            <div>
              <h5 className="text-primary font-bold">Invoiced as #{entry.invoice.invoiceNo}</h5>
              <p className="text-body-sm text-on-surface-variant">
                Invoice generated on{' '}
                {new Date(entry.invoice.date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                | Status: <span className="font-semibold">{entry.invoice.paymentStatus}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => alert('Viewing Invoice detail for ' + entry.invoice?.invoiceNo)}
            className="bg-surface-container border-outline-variant text-body-sm rounded-lg border-[0.5px] px-4 py-2 font-semibold transition-colors hover:bg-[#252525]"
          >
            View Invoice
          </button>
        </div>
      )}

      {/* Info Panel: Customer vs Dispatch details */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Customer Details */}
        <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-6">
          <h3 className="text-body-lg text-primary mb-4 border-b border-[#2e2e2e] pb-3 font-bold">
            Customer Details
          </h3>
          <div className="text-body-md text-on-surface flex flex-col gap-3">
            <div>
              <span className="text-on-surface-variant text-body-sm mb-0.5 block font-medium">
                Firm Name
              </span>
              <span className="text-primary text-body-lg font-semibold">
                {entry.customer.firmName}
              </span>
            </div>
            <div>
              <span className="text-on-surface-variant text-body-sm mb-0.5 block font-medium">
                Billing Address
              </span>
              {/* Address detail placeholder */}
              <span className="text-on-surface-variant">Gujarat, India</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-on-surface-variant text-body-sm mb-0.5 block font-medium">
                  GSTIN
                </span>
                <span className="text-primary font-mono">
                  {entry.customer.gstin || 'Unregistered'}
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant text-body-sm mb-0.5 block font-medium">
                  State
                </span>
                <span>{entry.customer.state}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dispatch Details */}
        <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-6">
          <h3 className="text-body-lg text-primary mb-4 border-b border-[#2e2e2e] pb-3 font-bold">
            Dispatch Details
          </h3>
          <div className="text-body-md text-on-surface flex flex-col gap-3">
            <div>
              <span className="text-on-surface-variant text-body-sm mb-0.5 block font-medium">
                Place of Dispatch
              </span>
              <span className="text-primary font-semibold">{entry.place}</span>
            </div>
            <div>
              <span className="text-on-surface-variant text-body-sm mb-0.5 block font-medium">
                Transport
              </span>
              <span>{entry.transport || 'Self Delivery / Local pickup'}</span>
            </div>
            <div>
              <span className="text-on-surface-variant text-body-sm mb-0.5 block font-medium">
                Dispatch Date
              </span>
              <span className="text-secondary font-semibold">
                {new Date(entry.date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Read-Only Line Items Table */}
      <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-6">
        <h3 className="text-body-lg text-primary mb-4 border-b border-[#2e2e2e] pb-3 font-bold">
          Line Items
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-outline-variant/40 border-b-[0.5px] pb-2">
                <th className="font-label-caps text-label-caps text-on-surface-variant pr-4 pb-3 tracking-wider uppercase">
                  Product
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant pr-4 pb-3 text-right tracking-wider uppercase">
                  Quantity
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant pr-4 pb-3 text-right tracking-wider uppercase">
                  Price
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant pr-4 pb-3 text-right tracking-wider uppercase">
                  CGST
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant pr-4 pb-3 text-right tracking-wider uppercase">
                  SGST
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant pr-4 pb-3 text-right tracking-wider uppercase">
                  IGST
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant pb-3 text-right tracking-wider uppercase">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-outline-variant/20 divide-y">
              {entry.items.map((item) => (
                <tr key={item.id} className="py-3">
                  <td className="py-3 pr-4">
                    <span className="text-body-md text-primary block font-semibold">
                      {item.product.name}
                    </span>
                    <span className="text-on-surface-variant text-[11px]">
                      Category: {item.product.category.name}
                    </span>
                  </td>
                  <td className="font-data-tabular py-3 pr-4 text-right font-medium">
                    {Number(item.quantity)} LTR
                  </td>
                  <td className="font-data-tabular py-3 pr-4 text-right font-medium">
                    {formatINR(item.price)}
                  </td>
                  <td className="text-on-surface-variant font-data-tabular py-3 pr-4 text-right">
                    {Number(item.cgst) > 0 ? formatINR(item.cgst) : '—'}
                  </td>
                  <td className="text-on-surface-variant font-data-tabular py-3 pr-4 text-right">
                    {Number(item.sgst) > 0 ? formatINR(item.sgst) : '—'}
                  </td>
                  <td className="text-on-surface-variant font-data-tabular py-3 pr-4 text-right">
                    {Number(item.igst) > 0 ? formatINR(item.igst) : '—'}
                  </td>
                  <td className="text-primary font-data-tabular py-3 text-right font-semibold">
                    {formatINR(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Block */}
        <div className="mt-6 flex flex-col items-end gap-2 border-t border-[#2e2e2e] pt-6 text-right">
          {Number(entry.totalCgst) > 0 && (
            <div className="text-body-sm text-on-surface-variant">
              Total CGST:{' '}
              <span className="text-primary font-semibold">{formatINR(entry.totalCgst)}</span>
            </div>
          )}
          {Number(entry.totalSgst) > 0 && (
            <div className="text-body-sm text-on-surface-variant">
              Total SGST:{' '}
              <span className="text-primary font-semibold">{formatINR(entry.totalSgst)}</span>
            </div>
          )}
          {Number(entry.totalIgst) > 0 && (
            <div className="text-body-sm text-on-surface-variant">
              Total IGST:{' '}
              <span className="text-primary font-semibold">{formatINR(entry.totalIgst)}</span>
            </div>
          )}
          <div className="my-1 h-[1px] w-48 bg-[#2e2e2e]"></div>
          <div className="text-body-md text-on-surface font-semibold">
            Grand Total:{' '}
            <span className="font-data-tabular text-secondary text-headline-sm mt-1 block font-bold">
              {formatINR(entry.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Stock Impact Section */}
      {entry.stockTransactions && entry.stockTransactions.length > 0 && (
        <div className="bg-surface-container border-outline-variant overflow-hidden rounded-xl border-[0.5px]">
          <button
            onClick={() => setIsStockImpactOpen((prev) => !prev)}
            className="flex w-full items-center justify-between p-6 transition-colors hover:bg-[#252525]"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[22px]">
                inventory
              </span>
              <h3 className="text-body-lg text-primary font-bold">Stock Impact Details</h3>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">
              {isStockImpactOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {isStockImpactOpen && (
            <div className="border-t border-[#2e2e2e] px-6 pt-4 pb-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#2e2e2e] pb-2">
                      <th className="font-label-caps text-label-caps text-on-surface-variant pb-2">
                        Product
                      </th>
                      <th className="font-label-caps text-label-caps text-on-surface-variant pb-2 text-right">
                        Qty Change
                      </th>
                      <th className="font-label-caps text-label-caps text-on-surface-variant pb-2 text-right">
                        Stock Before
                      </th>
                      <th className="font-label-caps text-label-caps text-on-surface-variant pb-2 text-right">
                        Stock After
                      </th>
                      <th className="font-label-caps text-label-caps text-on-surface-variant pb-2">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2e2e2e]/50">
                    {entry.stockTransactions.map((txn) => (
                      <tr key={txn.id} className="py-2">
                        <td className="text-primary py-2.5 font-semibold">{txn.product.name}</td>
                        <td
                          className={`font-data-tabular py-2.5 text-right font-semibold ${
                            Number(txn.changeQty) < 0 ? 'text-red-400' : 'text-green-400'
                          }`}
                        >
                          {Number(txn.changeQty) > 0 ? '+' : ''}
                          {Number(txn.changeQty)} LTR
                        </td>
                        <td className="text-on-surface-variant font-data-tabular py-2.5 text-right">
                          {Number(txn.stockBefore)} LTR
                        </td>
                        <td className="text-primary font-data-tabular py-2.5 text-right">
                          {Number(txn.stockAfter)} LTR
                        </td>
                        <td className="py-2.5">
                          <span className="text-on-surface-variant rounded bg-[#2a2a2a] px-2 py-0.5 text-[11px] font-semibold uppercase">
                            {txn.reason}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Dialog Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="animate-fade-in flex w-full max-w-md flex-col gap-4 rounded-xl border border-[#2e2e2e] bg-[#1f1f1f] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <span className="material-symbols-outlined text-[32px]">warning</span>
              <h3 className="text-headline-sm text-primary font-bold">
                Cancel this dispatch entry?
              </h3>
            </div>

            <p className="text-body-md text-on-surface-variant">
              This will reverse the stock decrement. The following stock will be restored:
            </p>

            {/* Restored items table/list */}
            <div className="bg-surface-container-low flex flex-col gap-2 rounded-lg border border-[#2e2e2e] p-3">
              {entry.items.map((item) => (
                <div
                  key={item.id}
                  className="text-body-sm flex items-center justify-between font-medium"
                >
                  <span className="text-primary">{item.product.name}</span>
                  <span className="font-data-tabular flex items-center gap-1 font-semibold text-green-400">
                    <span className="material-symbols-outlined text-[16px] text-green-400">
                      arrow_upward
                    </span>
                    {Number(item.quantity)} LTR
                  </span>
                </div>
              ))}
            </div>

            <p className="text-on-surface-variant/80 border-t border-[#2e2e2e] pt-3 text-[11px]">
              <strong className="text-red-400">Warning:</strong> This action cannot be undone.
              Restored stock will immediately be available for other dispatches.
            </p>

            <div className="mt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="border-outline-variant text-on-surface text-body-sm rounded-lg border-[0.5px] px-4 py-2 font-semibold transition-colors hover:bg-[#252525]"
                autoFocus
              >
                Keep Entry
              </button>
              <button
                onClick={handleCancelEntry}
                disabled={cancelling}
                className="text-body-sm flex items-center gap-1 rounded-lg bg-[#ef4444] px-4 py-2 font-bold text-white transition-colors hover:bg-red-600"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
