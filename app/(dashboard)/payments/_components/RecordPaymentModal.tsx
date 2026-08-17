'use client';

import React, { useState, useEffect, useMemo } from 'react';

type CustomerOption = { id: string; firmName: string };

type OpenInvoice = {
  id: string;
  invoiceNo: string | null;
  date: string;
  totalAmount: number;
  balanceDue: number;
};

type RecordPaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lockedCustomerId?: string;
  lockedCustomerName?: string;
};

const PAYMENT_MODES = [
  { value: 'BANK_TRANSFER', label: 'BANK TRANSFER', icon: 'account_balance' },
  { value: 'UPI', label: 'UPI', icon: 'qr_code_scanner' },
  { value: 'CASH', label: 'CASH', icon: 'payments' },
  { value: 'CHEQUE', label: 'CHEQUE', icon: 'receipt_long' },
  { value: 'OTHER', label: 'OTHER', icon: 'more_horiz' },
];

function formatINR(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(val);
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  lockedCustomerId,
  lockedCustomerName,
}: RecordPaymentModalProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState(lockedCustomerId ?? '');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('BANK_TRANSFER');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [billingMode, setBillingMode] = useState<'BILL_WISE' | 'OPEN_BALANCE'>('BILL_WISE');
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [showInvoices, setShowInvoices] = useState(true);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isOpen) return;
    setCustomerId(lockedCustomerId ?? '');
    setAmount('');
    setMode('BANK_TRANSFER');
    setDate(new Date().toISOString().split('T')[0]);
    setReference('');
    setFormError(null);
    setAllocations({});
    setOpenInvoices([]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, lockedCustomerId]);

  useEffect(() => {
    if (!isOpen || lockedCustomerId) return;
    fetch('/api/customers?limit=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setCustomers(data.data);
      })
      .catch((error) => console.error('Failed to fetch customers', error));
  }, [isOpen, lockedCustomerId]);

  // When a customer is chosen, load their open invoices + billing mode to drive the allocation UI.
  useEffect(() => {
    if (!isOpen || !customerId) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/customers/${customerId}/open-invoices`).then((r) => r.json()),
      fetch(`/api/customers/${customerId}`).then((r) => r.json()),
    ])
      .then(([invoicesRes, customerRes]) => {
        if (cancelled) return;
        setOpenInvoices(invoicesRes.data ?? []);
        const bm = customerRes.data?.billingMode ?? 'BILL_WISE';
        setBillingMode(bm);
        setShowInvoices(bm === 'BILL_WISE');
        setAllocations({});
      })
      .catch((error) => console.error('Failed to load open invoices', error));
    return () => {
      cancelled = true;
    };
  }, [isOpen, customerId]);

  const paymentAmount = Number(amount) || 0;
  const allocatedTotal = useMemo(
    () => Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [allocations]
  );
  const onAccount = Math.max(0, paymentAmount - allocatedTotal);
  const overAllocated = allocatedTotal > paymentAmount + 0.005;

  const setAllocation = (invoiceId: string, value: string) => {
    setAllocations((prev) => ({ ...prev, [invoiceId]: value }));
  };

  // Auto-apply the payment across open invoices oldest-first (FIFO).
  const autoAllocate = () => {
    let remaining = paymentAmount;
    const next: Record<string, string> = {};
    for (const inv of openInvoices) {
      if (remaining <= 0) break;
      const apply = Math.min(inv.balanceDue, remaining);
      if (apply > 0) {
        next[inv.id] = String(Math.round(apply * 100) / 100);
        remaining = Math.round((remaining - apply) * 100) / 100;
      }
    }
    setAllocations(next);
  };

  if (!isOpen) return null;

  const isFormValid = customerId !== '' && paymentAmount > 0 && date !== '' && !overAllocated;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    const invoiceAllocations = openInvoices
      .map((inv) => ({ invoiceId: inv.id, amount: Number(allocations[inv.id]) || 0 }))
      .filter((a) => a.amount > 0);

    // record any remainder as an explicit on-account (null-invoice) allocation
    const built: { invoiceId: string | null; amount: number }[] = [...invoiceAllocations];
    if (onAccount > 0.005)
      built.push({ invoiceId: null, amount: Math.round(onAccount * 100) / 100 });

    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          amount: paymentAmount,
          mode,
          reference: reference.trim() || undefined,
          date: new Date(date).toISOString(),
          allocations: built,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setFormError(result.error?.message || 'Failed to record payment');
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to record payment', error);
      setFormError('An unexpected error occurred while recording the payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allocatedPct =
    paymentAmount > 0 ? Math.min((allocatedTotal / paymentAmount) * 100, 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-surface-container animate-in zoom-in-95 relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-[0.5px] border-[#333] shadow-2xl duration-200">
        <div className="border-outline-variant flex items-center justify-between border-b-[0.5px] p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 text-primary flex h-10 w-10 items-center justify-center rounded-full">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <div>
              <h2 className="font-title-md text-title-md text-primary">Record Payment</h2>
              {lockedCustomerName && (
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  From: <span className="font-medium">{lockedCustomerName}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {formError && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                <span className="material-symbols-outlined mt-0.5 text-[20px]">error</span>
                <p className="text-body-sm">{formError}</p>
              </div>
            )}

            <div className="space-y-5">
              {!lockedCustomerId && (
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Customer *
                  </label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="bg-surface-container-low border-outline-variant text-body-md text-primary focus:border-secondary w-full rounded-xl border-[0.5px] p-3.5 transition-colors outline-none"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firmName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-surface-container-low border-outline-variant text-body-md text-primary focus:border-secondary w-full rounded-xl border-[0.5px] p-3.5 transition-colors outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {PAYMENT_MODES.map((m) => (
                    <div
                      key={m.value}
                      onClick={() => setMode(m.value)}
                      className={`cursor-pointer rounded-xl border-[0.5px] p-3 text-center transition-all ${mode === m.value ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-[#8e9192]'}`}
                    >
                      <span className="material-symbols-outlined mb-1 text-[24px]">{m.icon}</span>
                      <p className="font-label-caps text-[11px] font-bold tracking-wider">
                        {m.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-surface-container-low border-outline-variant text-body-md text-primary focus:border-secondary w-full rounded-xl border-[0.5px] p-3.5 transition-colors outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Reference / UTR No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR123..."
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="bg-surface-container-low border-outline-variant text-body-md text-primary focus:border-secondary w-full rounded-xl border-[0.5px] p-3.5 transition-colors outline-none"
                  />
                </div>
              </div>

              {/* Allocation section */}
              {customerId && paymentAmount > 0 && (
                <div className="border-outline-variant rounded-xl border-[0.5px] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                      Apply to Invoices
                    </label>
                    <div className="flex items-center gap-2">
                      {billingMode === 'OPEN_BALANCE' && openInvoices.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowInvoices((v) => !v)}
                          className="text-secondary text-[12px] font-medium"
                        >
                          {showInvoices ? 'Hide invoices' : 'Show individual invoices'}
                        </button>
                      )}
                      {openInvoices.length > 0 && (
                        <button
                          type="button"
                          onClick={autoAllocate}
                          className="text-secondary text-[12px] font-medium"
                        >
                          Auto-allocate
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Segmented allocation bar */}
                  <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-[#222]">
                    <div
                      className={`h-full ${overAllocated ? 'bg-error' : 'bg-secondary'}`}
                      style={{ width: `${allocatedPct}%` }}
                    />
                  </div>
                  <div className="mb-3 flex justify-between text-[12px]">
                    <span className="text-on-surface-variant">
                      Allocated:{' '}
                      <span className={overAllocated ? 'text-error' : 'text-primary'}>
                        {formatINR(allocatedTotal)}
                      </span>
                    </span>
                    <span className="text-on-surface-variant">
                      On account: <span className="text-secondary">{formatINR(onAccount)}</span>
                    </span>
                  </div>

                  {openInvoices.length === 0 ? (
                    <p className="text-on-surface-variant text-[12px]">
                      No open invoices — the full amount will be recorded as on-account credit.
                    </p>
                  ) : (
                    showInvoices && (
                      <div className="divide-outline-variant/30 max-h-52 divide-y overflow-y-auto">
                        {openInvoices.map((inv) => (
                          <div key={inv.id} className="flex items-center gap-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-body-sm text-primary truncate font-medium">
                                {inv.invoiceNo ?? '—'}
                              </p>
                              <p className="text-on-surface-variant text-[11px]">
                                Due {formatINR(inv.balanceDue)}
                              </p>
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              max={inv.balanceDue}
                              value={allocations[inv.id] ?? ''}
                              onChange={(e) => setAllocation(inv.id, e.target.value)}
                              placeholder="0.00"
                              className="bg-surface-container-lowest border-outline-variant text-body-sm w-28 rounded-lg border-[0.5px] px-2 py-1.5 text-right"
                            />
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {overAllocated && (
                    <p className="text-error mt-2 text-[12px]">
                      Allocated total exceeds the payment amount.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-container-high border-outline-variant flex justify-end gap-3 border-t-[0.5px] p-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-outline-variant text-on-surface hover:bg-surface-container-highest font-body-md rounded-xl border-[0.5px] px-6 py-2.5 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="bg-primary text-on-primary font-body-md flex items-center gap-2 rounded-xl px-6 py-2.5 font-bold shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {isSubmitting ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
