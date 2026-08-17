'use client';

import { useEffect, useState } from 'react';
import { DetailCard } from '@/components/ui/DetailCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { RegistrationMark } from '@/components/ui/RegistrationMark';
import { StatusPill, type Status } from '@/components/ui/StatusPill';

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

export function LedgerView({ customerId }: { customerId: string }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const ledgerRes = await fetch(`/api/customers/${customerId}/ledger`).then((r) => r.json());
        if (cancelled) return;
        if (ledgerRes.data) setEntries(ledgerRes.data);
        else setError(ledgerRes.error?.message || 'Failed to load ledger');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load ledger', err);
        setError('Failed to load ledger.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const closingBalance = entries.length > 0 ? entries[entries.length - 1].running : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RegistrationMark size="lg" spinning />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-status-error/30 bg-status-error/10 text-status-error flex items-start gap-3 rounded-lg border p-4">
        <span className="material-symbols-outlined mt-0.5 text-[20px]">error</span>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <DetailCard
      title="Ledger"
      headerAside={
        <span className="text-on-surface-variant text-sm">
          Closing balance:{' '}
          <span
            className={`font-mono font-semibold ${closingBalance > 0 ? 'text-status-error' : 'text-status-success'}`}
          >
            {formatINR(Math.abs(closingBalance))} {closingBalance > 0 ? 'Dr' : 'Cr'}
          </span>
        </span>
      }
      contentClassName="p-0"
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={<span className="material-symbols-outlined text-[40px]">menu_book</span>}
          title="No ledger activity yet"
          description="Invoices and payments for this customer will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-container-high text-on-surface-variant border-border border-b text-[11px] font-medium tracking-widest uppercase">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Particulars</th>
                <th className="px-5 py-3 text-right">Debit</th>
                <th className="px-5 py-3 text-right">Credit</th>
                <th className="px-5 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {entries.map((entry) => {
                const voided = entry.status === 'VOID';
                return (
                  <tr key={`${entry.kind}-${entry.id}`} className={voided ? 'opacity-50' : ''}>
                    <td className="text-on-surface-variant px-5 py-3 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-5 py-3">
                      {entry.kind === 'INVOICE' ? (
                        <div className="flex flex-col gap-1">
                          <span className={`font-medium ${voided ? 'line-through' : ''}`}>
                            {entry.invoice?.type === 'OPENING_BALANCE'
                              ? 'Opening Balance'
                              : `Invoice ${entry.invoice?.invoiceNo ?? ''}`}
                          </span>
                          {!voided && entry.invoice && (
                            <StatusPill status={entry.invoice.displayStatus as Status} />
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className={`font-medium ${voided ? 'line-through' : ''}`}>
                            Payment · {entry.payment?.mode.replace('_', ' ')}
                            {voided && ' (voided)'}
                          </span>
                          {entry.payment && entry.payment.breakdown.length > 0 && (
                            <p className="text-on-surface-variant text-xs">
                              {entry.payment.breakdown
                                .map((b) =>
                                  b.invoiceId
                                    ? `${b.invoiceNo ?? '—'}: ${formatINR(b.amount)}`
                                    : `On account: ${formatINR(b.amount)}`
                                )
                                .join(' · ')}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {entry.debit > 0 ? formatINR(entry.debit) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {entry.credit > 0 ? formatINR(entry.credit) : '—'}
                    </td>
                    <td className="text-on-surface-variant px-5 py-3 text-right font-mono">
                      {voided ? '—' : formatINR(entry.running)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DetailCard>
  );
}
