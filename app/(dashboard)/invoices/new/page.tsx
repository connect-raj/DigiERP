'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type DispatchEntryOption = {
  id: string;
  challanNo: string;
  date: string;
  customer: { firmName: string };
};

type DispatchEntryItem = {
  id: string;
  productId: string;
  productName: string;
  categoryName: string;
  quantity: string | number;
  price: string | number;
  lineTotal: string | number;
};

type DispatchEntry = {
  id: string;
  challanNo: string;
  place: string;
  transport?: string | null;
  transportAmount?: string | number | null;
  date: string;
  status: 'PENDING_BILLING' | 'BILLED';
  isCancelled: boolean;
  totalAmount: string | number;
  customer: {
    id: string;
    firmName: string;
    state: string;
    gstin?: string | null;
  };
  items: DispatchEntryItem[];
  invoice?: { id: string; invoiceNo: string } | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  DISPATCH_ENTRY_NOT_FOUND: 'This dispatch entry could not be found. It may have been removed.',
  DISPATCH_ENTRY_ALREADY_BILLED: 'This dispatch entry has already been invoiced.',
  DISPATCH_ENTRY_CANCELLED: 'This dispatch entry was cancelled and cannot be invoiced.',
  SETTINGS_NOT_CONFIGURED:
    'Company settings are not configured. Please contact your administrator.',
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

function CreateInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('dispatchEntryId');

  const [pickerOptions, setPickerOptions] = useState<DispatchEntryOption[]>([]);
  const [pickerLoading, setPickerLoading] = useState(!preselectedId);
  const [selectedId, setSelectedId] = useState(preselectedId || '');

  const [entry, setEntry] = useState<DispatchEntry | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedId) return;
    // Entry picker needs the full list, not a paginated page.
    fetch('/api/dispatch-entries?status=PENDING_BILLING&isCancelled=false&limit=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setPickerOptions(data.data);
      })
      .catch((error) => console.error('Failed to load dispatch entries', error))
      .finally(() => setPickerLoading(false));
  }, [preselectedId]);

  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntry(null);
      return;
    }
    const fetchEntry = async () => {
      try {
        setEntryLoading(true);
        setEntryError(null);
        const res = await fetch(`/api/dispatch-entries/${selectedId}`);
        const data = await res.json();
        if (!res.ok || !data.data) {
          setEntryError(data.error?.message || 'Failed to load dispatch entry');
          return;
        }
        setEntry(data.data);
      } catch (err) {
        console.error('Failed to load dispatch entry', err);
        setEntryError('Failed to load dispatch entry.');
      } finally {
        setEntryLoading(false);
      }
    };
    fetchEntry();
  }, [selectedId]);

  const handleGenerate = async () => {
    if (!entry) return;
    try {
      setSubmitting(true);
      setSubmitError(null);
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispatchEntryId: entry.id,
          date: new Date(invoiceDate).toISOString(),
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        const code = result.error?.code as string | undefined;
        setSubmitError(
          (code && ERROR_MESSAGES[code]) || result.error?.message || 'Failed to generate invoice.'
        );
        setShowConfirm(false);
        return;
      }
      router.push(`/invoices/${result.data.id}`);
    } catch (err) {
      console.error('Failed to generate invoice', err);
      setSubmitError('An unexpected error occurred while generating the invoice.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Picker mode: no dispatch entry selected yet
  if (!preselectedId && !selectedId) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-12">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/invoices')}
            className="bg-surface-container border-outline-variant flex h-9 w-9 items-center justify-center rounded-lg border-[0.5px] transition-colors hover:bg-[#252525]"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-primary">Create Invoice</h1>
        </div>

        <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
          <h2 className="font-title-md text-title-md text-primary mb-4">
            Select a Dispatch Entry to Invoice
          </h2>
          {pickerLoading ? (
            <p className="text-on-surface-variant text-body-sm">Loading pending entries...</p>
          ) : pickerOptions.length === 0 ? (
            <p className="text-on-surface-variant text-body-sm">
              No dispatch entries are pending billing right now.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pickerOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedId(opt.id)}
                  className="border-outline-variant flex items-center justify-between rounded-lg border-[0.5px] p-4 text-left transition-colors hover:bg-[#252525]"
                >
                  <div>
                    <p className="text-primary font-semibold">Challan #{opt.challanNo}</p>
                    <p className="text-on-surface-variant text-[13px]">
                      {opt.customer.firmName} · {formatDate(opt.date)}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (entryLoading) {
    return (
      <div className="text-on-surface-variant flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-secondary animate-spin text-[32px]">
            progress_activity
          </span>
          <span>Loading dispatch entry...</span>
        </div>
      </div>
    );
  }

  if (entryError || !entry) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-[48px] text-red-400">error</span>
        <p className="text-body-lg text-primary font-bold">
          {entryError || 'Dispatch entry not found'}
        </p>
        <button
          onClick={() => router.push('/invoices')}
          className="bg-surface-container border-outline-variant text-primary text-body-sm rounded-lg border-[0.5px] px-4 py-2 transition-colors hover:bg-[#252525]"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  if (entry.status !== 'PENDING_BILLING' || entry.isCancelled) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-[48px] text-red-400">error</span>
        <p className="text-body-lg text-primary font-bold">
          {entry.isCancelled
            ? ERROR_MESSAGES.DISPATCH_ENTRY_CANCELLED
            : ERROR_MESSAGES.DISPATCH_ENTRY_ALREADY_BILLED}
        </p>
        <button
          onClick={() => router.push(`/dispatch-entries/${entry.id}`)}
          className="bg-surface-container border-outline-variant text-primary text-body-sm rounded-lg border-[0.5px] px-4 py-2 transition-colors hover:bg-[#252525]"
        >
          View Dispatch Entry
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-6 pb-24">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/dispatch-entries/${entry.id}`)}
          className="bg-surface-container border-outline-variant flex h-9 w-9 items-center justify-center rounded-lg border-[0.5px] transition-colors hover:bg-[#252525]"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary">Create Invoice</h1>
          <p className="text-on-surface-variant text-body-sm mt-0.5">
            Review the dispatch entry details before generating the invoice.
          </p>
        </div>
      </div>

      {submitError && (
        <div className="text-body-md flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          <span className="material-symbols-outlined mt-0.5 text-[20px]">error</span>
          <div>
            <h5 className="font-bold">Unable to Generate Invoice</h5>
            <p className="text-body-sm mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-6 xl:col-span-8">
          {/* Summary Card */}
          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">local_shipping</span>
              Dispatch Summary
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant block uppercase">
                  Customer
                </span>
                <span className="text-primary text-body-lg font-semibold">
                  {entry.customer.firmName}
                </span>
              </div>
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant block uppercase">
                  Challan No.
                </span>
                <span className="text-primary font-mono">#{entry.challanNo}</span>
              </div>
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant block uppercase">
                  Place of Supply
                </span>
                <span className="text-primary">{entry.place}</span>
              </div>
              {entry.transportAmount != null && Number(entry.transportAmount) > 0 && (
                <div>
                  <span className="font-label-caps text-label-caps text-on-surface-variant block uppercase">
                    Transport Amount
                  </span>
                  <span className="text-primary">{formatINR(entry.transportAmount)}</span>
                </div>
              )}
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant block uppercase">
                  GST
                </span>
                <span className="text-on-surface-variant">
                  Calculated automatically on generation
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="bg-surface-container-low border-outline-variant text-body-md text-primary focus:border-secondary w-full rounded-xl border-[0.5px] p-3 transition-colors outline-none"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-surface-container border-outline-variant overflow-x-auto rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">category</span>
              Line Items
            </h2>
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-outline-variant border-b-[0.5px]">
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-2 pb-3 uppercase">
                    Product
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-2 pb-3 text-right uppercase">
                    Qty
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-2 pb-3 text-right uppercase">
                    Price
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-2 pb-3 text-right uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {entry.items.map((item) => (
                  <tr key={item.id} className="border-outline-variant/30 border-b-[0.5px]">
                    <td className="px-2 py-3">
                      <p className="text-primary font-medium">{item.productName}</p>
                      <p className="text-on-surface-variant text-[11px]">{item.categoryName}</p>
                    </td>
                    <td className="font-data-tabular px-2 py-3 text-right">
                      {Number(item.quantity)} LTR
                    </td>
                    <td className="font-data-tabular px-2 py-3 text-right">
                      {formatINR(item.price)}
                    </td>
                    <td className="font-data-tabular text-primary px-2 py-3 text-right font-semibold">
                      {formatINR(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Actions */}
        <div className="flex flex-col gap-6 xl:col-span-4">
          <div className="bg-surface-container border-outline-variant sticky top-6 rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-6">Totals</h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-title-md text-title-md text-primary">Product Total</span>
                <span className="font-display text-secondary font-data-tabular text-[24px] font-bold">
                  {formatINR(entry.totalAmount)}
                </span>
              </div>
              <p className="text-on-surface-variant text-[11px]">
                GST will be calculated automatically based on the customer&apos;s location and added
                to the invoice total.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="bg-primary text-on-primary font-body-md flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold transition-all hover:opacity-90 active:scale-95"
              >
                <span className="material-symbols-outlined">receipt_long</span>
                Generate Invoice
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dispatch-entries/${entry.id}`)}
                className="border-outline-variant text-on-surface hover:bg-surface-container-high font-body-md rounded-xl border-[0.5px] py-3.5 font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-[#2e2e2e] bg-[#1f1f1f] p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-[32px]">
                receipt_long
              </span>
              <h3 className="text-headline-sm text-primary font-bold">Generate this invoice?</h3>
            </div>
            <p className="text-body-md text-on-surface-variant">
              This will permanently invoice Challan #{entry.challanNo} for{' '}
              <strong className="text-primary">{entry.customer.firmName}</strong>. Once generated,
              the invoice cannot be edited or deleted.
            </p>
            <div className="bg-surface-container-low flex flex-col gap-2 rounded-lg border border-[#2e2e2e] p-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Invoice Date</span>
                <span className="text-primary font-semibold">
                  {formatDate(new Date(invoiceDate).toISOString())}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Product Total</span>
                <span className="text-primary font-data-tabular font-semibold">
                  {formatINR(entry.totalAmount)}
                </span>
              </div>
            </div>
            <p className="text-on-surface-variant/80 mt-1 text-[11px]">
              GST will be added automatically -- the invoice total may be higher than the product
              total shown above.
            </p>
            <div className="mt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="border-outline-variant text-on-surface text-body-sm rounded-lg border-[0.5px] px-4 py-2 font-semibold transition-colors hover:bg-[#252525]"
              >
                Go Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={submitting}
                className="bg-primary text-on-primary text-body-sm rounded-lg px-4 py-2 font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Generating...' : 'Confirm & Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="text-on-surface-variant flex h-full items-center justify-center p-12">
          Loading...
        </div>
      }
    >
      <CreateInvoiceContent />
    </Suspense>
  );
}
