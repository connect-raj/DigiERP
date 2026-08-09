'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DetailCard } from '@/components/ui/DetailCard';
import { StatusPill, type Status } from '@/components/ui/StatusPill';
import { RegistrationMark } from '@/components/ui/RegistrationMark';

type StockTransaction = {
  id: string;
  productId: string;
  changeQty: string | number;
  stockBefore: string | number;
  stockAfter: string | number;
  reason: string;
  createdAt: string;
  productName: string;
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
  customerId: string;
  place: string;
  transport?: string | null;
  transportAmount?: string | number | null;
  date: string;
  entryDate: string;
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
  invoice?: {
    id: string;
    invoiceNo: string;
    date: string;
    paymentStatus: string;
  } | null;
  stockTransactions?: StockTransaction[];
};

type PaymentAllocation = {
  id: string;
  amount: string | number;
  createdAt: string;
  payment: { id: string; mode: string; reference: string | null; date: string };
};

function formatINR(val: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(val));
}

function formatDate(val: string) {
  return new Date(val).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function dispatchStatus(entry: DispatchEntry): Status {
  if (entry.isCancelled) return 'CANCELLED';
  return entry.status === 'BILLED' ? 'INVOICED' : 'DISPATCHED';
}

export default function DispatchEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [entry, setEntry] = useState<DispatchEntry | null>(null);
  const [balanceDue, setBalanceDue] = useState<number | null>(null);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isStockImpactOpen, setIsStockImpactOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dispatch-entries/${id}`);
      const data = await res.json();
      if (!res.ok || !data.data) {
        setError(data.error?.message || 'Failed to fetch dispatch entry details');
        return;
      }
      const dispatch: DispatchEntry = data.data;
      setEntry(dispatch);

      // Pull the invoice's balance + allocations so the lifecycle shows payments.
      if (dispatch.invoice?.id) {
        const [invRes, allocRes] = await Promise.all([
          fetch(`/api/invoices/${dispatch.invoice.id}`).then((r) => r.json()),
          fetch(`/api/invoices/${dispatch.invoice.id}/payments`).then((r) => r.json()),
        ]);
        if (invRes.data) setBalanceDue(Number(invRes.data.balanceDue));
        if (allocRes.data) setAllocations(allocRes.data);
      } else {
        setBalanceDue(null);
        setAllocations([]);
      }
    } catch (err) {
      console.error('Failed to load dispatch details', err);
      setError('Failed to load dispatch entry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDetails();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelEntry = async () => {
    try {
      setCancelling(true);
      const res = await fetch(`/api/dispatch-entries/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error?.message || 'Failed to cancel dispatch entry');
      } else {
        setIsCancelModalOpen(false);
        fetchDetails();
      }
    } catch (err) {
      console.error('Error cancelling entry', err);
      alert('An unexpected error occurred.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="text-on-surface-variant flex h-full items-center justify-center p-12">
        <RegistrationMark size="lg" spinning />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-status-error text-[48px]">error</span>
        <p className="text-on-surface font-semibold">{error || 'Dispatch entry not found'}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/dispatch-entries')}>
          Back to list
        </Button>
      </div>
    );
  }

  const canGenerateInvoice = !entry.isCancelled && entry.status === 'PENDING_BILLING';
  const canRecordPayment =
    !entry.isCancelled && entry.status === 'BILLED' && (balanceDue ?? 0) > 0.005 && !!entry.invoice;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* In-page record header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/dispatch-entries')}>
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-on-surface text-xl font-semibold tracking-tight">
                Challan #{entry.challanNo}
              </h1>
              <StatusPill status={dispatchStatus(entry)} />
            </div>
            <p className="text-on-surface-variant mt-0.5 text-sm">
              Recorded {formatDate(entry.entryDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!entry.isCancelled && (
            <Button asChild variant="outline" size="sm">
              <a
                href={`/api/dispatch-entries/${entry.id}/slip`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Print Slip
              </a>
            </Button>
          )}
          {canGenerateInvoice && (
            <>
              <Button variant="destructive" size="sm" onClick={() => setIsCancelModalOpen(true)}>
                Cancel Entry
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/invoices/new?dispatchEntryId=${entry.id}`)}
              >
                Generate Invoice
              </Button>
            </>
          )}
          {canRecordPayment && (
            <Button size="sm" onClick={() => router.push(`/invoices/${entry.invoice!.id}`)}>
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Lifecycle: linked records */}
      <DetailCard title="Lifecycle">
        <ol className="flex flex-col gap-3">
          <li className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-accent-cyan text-[22px]">
                local_shipping
              </span>
              <div>
                <p className="text-on-surface text-sm font-medium">
                  Dispatched · #{entry.challanNo}
                </p>
                <p className="text-on-surface-variant text-xs">{formatDate(entry.date)}</p>
              </div>
            </div>
            <StatusPill status={dispatchStatus(entry)} />
          </li>

          {entry.invoice ? (
            <li className="border-border flex items-center justify-between gap-4 border-t pt-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-accent-magenta text-[22px]">
                  receipt_long
                </span>
                <div>
                  <p className="text-on-surface text-sm font-medium">
                    Invoiced · {entry.invoice.invoiceNo}
                  </p>
                  <p className="text-on-surface-variant text-xs">
                    {formatDate(entry.invoice.date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={entry.invoice.paymentStatus as Status} />
                <Button asChild variant="outline" size="sm">
                  <Link href={`/invoices/${entry.invoice.id}`}>View</Link>
                </Button>
              </div>
            </li>
          ) : (
            !entry.isCancelled && (
              <li className="border-border text-on-surface-variant flex items-center gap-3 border-t pt-3 text-sm">
                <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                Not yet invoiced.
              </li>
            )
          )}

          {entry.invoice && (
            <li className="border-border border-t pt-3">
              <div className="mb-2 flex items-center gap-3">
                <span className="material-symbols-outlined text-accent-yellow text-[22px]">
                  payments
                </span>
                <p className="text-on-surface text-sm font-medium">
                  Payments{' '}
                  {balanceDue != null && balanceDue > 0.005 && (
                    <span className="text-status-error font-mono text-xs">
                      · {formatINR(balanceDue)} due
                    </span>
                  )}
                </p>
              </div>
              {allocations.length === 0 ? (
                <p className="text-on-surface-variant pl-9 text-xs">
                  No payments allocated to this invoice yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5 pl-9">
                  {allocations.map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-sm">
                      <Link
                        href={`/payments/${a.payment.id}`}
                        className="text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        {a.payment.mode.replace('_', ' ')}
                        {a.payment.reference ? ` · ${a.payment.reference}` : ''} ·{' '}
                        {formatDate(a.createdAt)}
                      </Link>
                      <span className="font-mono">{formatINR(a.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}
        </ol>
      </DetailCard>

      {/* Customer + Dispatch details */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DetailCard title="Customer">
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-on-surface-variant text-xs">Firm Name</dt>
              <dd>
                <Link
                  href={`/customers/${entry.customer.id}`}
                  className="text-on-surface font-medium hover:underline"
                >
                  {entry.customer.firmName}
                </Link>
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-on-surface-variant text-xs">GSTIN</dt>
                <dd className="font-mono">{entry.customer.gstin || 'Unregistered'}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">State</dt>
                <dd>{entry.customer.state}</dd>
              </div>
            </div>
          </dl>
        </DetailCard>

        <DetailCard title="Dispatch">
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-on-surface-variant text-xs">Place of Dispatch</dt>
              <dd className="font-medium">{entry.place}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant text-xs">Transport</dt>
              <dd>{entry.transport || 'Self delivery / local pickup'}</dd>
            </div>
            {entry.transportAmount != null && Number(entry.transportAmount) > 0 && (
              <div>
                <dt className="text-on-surface-variant text-xs">Transport Amount</dt>
                <dd className="font-mono">{formatINR(entry.transportAmount)}</dd>
              </div>
            )}
            <div>
              <dt className="text-on-surface-variant text-xs">Dispatch Date</dt>
              <dd>{formatDate(entry.date)}</dd>
            </div>
          </dl>
        </DetailCard>
      </div>

      {/* Line items */}
      <DetailCard title="Line Items" contentClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-container-high text-on-surface-variant border-border border-b text-[11px] font-medium tracking-widest uppercase">
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3 text-right">Quantity</th>
                <th className="px-5 py-3 text-right">Price</th>
                <th className="px-5 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {entry.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3">
                    <span className="text-on-surface block font-medium">{item.productName}</span>
                    <span className="text-on-surface-variant text-xs">{item.categoryName}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono">{Number(item.quantity)}</td>
                  <td className="px-5 py-3 text-right font-mono">{formatINR(item.price)}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold">
                    {formatINR(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-border flex flex-col items-end gap-1 border-t px-5 py-4">
          {entry.transportAmount != null && Number(entry.transportAmount) > 0 && (
            <div className="text-on-surface-variant text-sm">
              Transport: <span className="font-mono">{formatINR(entry.transportAmount)}</span>
            </div>
          )}
          <div className="text-on-surface text-sm">
            Grand Total:{' '}
            <span className="font-mono text-lg font-bold">{formatINR(entry.totalAmount)}</span>
          </div>
        </div>
      </DetailCard>

      {/* Stock impact */}
      {entry.stockTransactions && entry.stockTransactions.length > 0 && (
        <DetailCard
          title="Stock Impact"
          headerAside={
            <button
              onClick={() => setIsStockImpactOpen((p) => !p)}
              className="text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">
                {isStockImpactOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          }
          contentClassName={isStockImpactOpen ? 'p-0' : 'hidden'}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-container-high text-on-surface-variant border-border border-b text-[11px] font-medium tracking-widest uppercase">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 text-right">Qty Change</th>
                  <th className="px-5 py-3 text-right">Before</th>
                  <th className="px-5 py-3 text-right">After</th>
                  <th className="px-5 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {entry.stockTransactions.map((txn) => (
                  <tr key={txn.id}>
                    <td className="px-5 py-3 font-medium">{txn.productName}</td>
                    <td
                      className={`px-5 py-3 text-right font-mono ${Number(txn.changeQty) < 0 ? 'text-status-error' : 'text-status-success'}`}
                    >
                      {Number(txn.changeQty) > 0 ? '+' : ''}
                      {Number(txn.changeQty)}
                    </td>
                    <td className="text-on-surface-variant px-5 py-3 text-right font-mono">
                      {Number(txn.stockBefore)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{Number(txn.stockAfter)}</td>
                    <td className="px-5 py-3">
                      <span className="bg-surface-container-high text-on-surface-variant rounded px-2 py-0.5 text-[11px] font-medium uppercase">
                        {txn.reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailCard>
      )}

      {/* Cancel confirmation */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="border-border bg-surface-container flex w-full max-w-md flex-col gap-4 rounded-xl border p-6 shadow-2xl">
            <div className="text-status-error flex items-center gap-3">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="text-on-surface font-display text-lg font-semibold">
                Cancel this dispatch entry?
              </h3>
            </div>
            <p className="text-on-surface-variant text-sm">
              This reverses the stock decrement. The following stock will be restored:
            </p>
            <div className="border-border bg-surface-container-low flex flex-col gap-2 rounded-lg border p-3">
              {entry.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.productName}</span>
                  <span className="text-status-success font-mono">+{Number(item.quantity)}</span>
                </div>
              ))}
            </div>
            <p className="text-on-surface-variant border-border border-t pt-3 text-xs">
              <span className="text-status-error font-semibold">Warning:</span> This cannot be
              undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsCancelModalOpen(false)}>
                Keep Entry
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={cancelling}
                onClick={handleCancelEntry}
              >
                {cancelling ? 'Cancelling…' : 'Cancel Entry'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
