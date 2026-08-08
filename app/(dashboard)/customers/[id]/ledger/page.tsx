'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

type Breakdown = { invoiceId: string | null; invoiceNo: string | null; amount: number };

type LedgerEntry = {
  kind: 'INVOICE' | 'PAYMENT';
  id: string;
  date: string;
  status: 'ACTIVE' | 'VOID';
  debit: number;
  credit: number;
  running: number;
  invoice?: {
    invoiceNo: string | null;
    type: 'STANDARD' | 'OPENING_BALANCE';
    totalAmount: number;
    balanceDue: number;
    displayStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  };
  payment?: {
    mode: string;
    reference: string | null;
    onAccount: number;
    breakdown: Breakdown[];
  };
};

function formatINR(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(val);
}

function formatDate(val: string) {
  return new Date(val).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function CustomerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [ledgerRes, customerRes] = await Promise.all([
          fetch(`/api/customers/${id}/ledger`).then((r) => r.json()),
          fetch(`/api/customers/${id}`).then((r) => r.json()),
        ]);
        if (ledgerRes.data) setEntries(ledgerRes.data);
        else setError(ledgerRes.error?.message || 'Failed to load ledger');
        if (customerRes.data) setCustomerName(customerRes.data.firmName);
      } catch (err) {
        console.error('Failed to load ledger', err);
        setError('Failed to load ledger.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const closingBalance = entries.length > 0 ? entries[entries.length - 1].running : 0;

  if (loading) {
    return (
      <div className="text-on-surface-variant flex h-full items-center justify-center p-12">
        <span className="material-symbols-outlined text-secondary animate-spin text-[32px]">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/customers/${id}`)}
          className="bg-surface-container border-outline-variant flex h-9 w-9 items-center justify-center rounded-lg border-[0.5px] transition-colors hover:bg-[#252525]"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary">Statement of Account</h1>
          <p className="text-on-surface-variant text-body-sm mt-0.5">{customerName}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          <span className="material-symbols-outlined mt-0.5 text-[20px]">error</span>
          <p className="text-body-sm">{error}</p>
        </div>
      )}

      <div className="bg-surface-container border-outline-variant overflow-hidden rounded-2xl border-[0.5px]">
        <div className="border-outline-variant flex items-center justify-between border-b-[0.5px] p-5">
          <h2 className="font-title-md text-title-md text-primary">Ledger</h2>
          <div className="text-body-sm text-on-surface-variant">
            Closing balance:{' '}
            <span
              className={`font-data-tabular font-bold ${closingBalance > 0 ? 'text-amber-400' : 'text-secondary'}`}
            >
              {formatINR(Math.abs(closingBalance))} {closingBalance > 0 ? 'Dr' : 'Cr'}
            </span>
          </div>
        </div>

        {entries.length === 0 ? (
          <p className="text-on-surface-variant text-body-sm p-8 text-center">
            No ledger activity yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-outline-variant border-b-[0.5px]">
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 uppercase">
                    Date
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 uppercase">
                    Particulars
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 text-right uppercase">
                    Debit
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 text-right uppercase">
                    Credit
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 text-right uppercase">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-outline-variant/30 divide-y">
                {entries.map((entry) => {
                  const voided = entry.status === 'VOID';
                  return (
                    <tr
                      key={`${entry.kind}-${entry.id}`}
                      className={`transition-colors hover:bg-[#222] ${voided ? 'opacity-50' : ''}`}
                    >
                      <td className="text-on-surface-variant px-5 py-3 text-[13px] whitespace-nowrap">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-5 py-3">
                        {entry.kind === 'INVOICE' ? (
                          <div>
                            <p
                              className={`text-body-sm text-primary font-medium ${voided ? 'line-through' : ''}`}
                            >
                              {entry.invoice?.type === 'OPENING_BALANCE'
                                ? 'Opening Balance'
                                : `Invoice ${entry.invoice?.invoiceNo ?? ''}`}
                            </p>
                            {!voided && entry.invoice && entry.invoice.balanceDue > 0.005 && (
                              <p className="text-[11px] text-amber-400">
                                {formatINR(entry.invoice.balanceDue)} due
                              </p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p
                              className={`text-body-sm text-primary font-medium ${voided ? 'line-through' : ''}`}
                            >
                              Payment · {entry.payment?.mode.replace('_', ' ')}
                              {voided && ' (voided)'}
                            </p>
                            {entry.payment && entry.payment.breakdown.length > 0 && (
                              <p className="text-on-surface-variant text-[11px]">
                                {entry.payment.breakdown
                                  .map((b) =>
                                    b.invoiceId
                                      ? `${b.invoiceNo ?? '—'}: ${formatINR(b.amount)}`
                                      : `On account: ${formatINR(b.amount)}`
                                  )
                                  .join(' · ')}
                              </p>
                            )}
                            {entry.payment && entry.payment.onAccount > 0.005 && (
                              <p className="text-secondary text-[11px]">
                                {formatINR(entry.payment.onAccount)} on account
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="font-data-tabular text-primary px-5 py-3 text-right">
                        {entry.debit > 0 ? formatINR(entry.debit) : '—'}
                      </td>
                      <td className="font-data-tabular text-primary px-5 py-3 text-right">
                        {entry.credit > 0 ? formatINR(entry.credit) : '—'}
                      </td>
                      <td className="font-data-tabular text-on-surface-variant px-5 py-3 text-right">
                        {voided ? '—' : formatINR(entry.running)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
