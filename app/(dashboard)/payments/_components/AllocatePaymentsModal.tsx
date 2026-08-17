'use client';

import React, { useState, useEffect, useMemo } from 'react';

type PaymentOption = {
  id: string;
  amount: string | number;
  onAccount: string | number;
  mode: string;
  reference: string | null;
  status?: 'ACTIVE' | 'VOID';
  date: string;
};

type ExistingAllocation = {
  invoiceId: string | null;
  invoiceNo: string | null;
  amount: string | number;
};

type OpenInvoice = {
  id: string;
  invoiceNo: string | null;
  balanceDue: number;
};

type NewLine = { invoiceId: string; amount: string };

type AllocatePaymentsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerId: string;
  customerName?: string;
  initialPaymentId?: string;
};

function formatINR(val: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(val));
}

export default function AllocatePaymentsModal({
  isOpen,
  onClose,
  onSuccess,
  customerId,
  customerName,
  initialPaymentId,
}: AllocatePaymentsModalProps) {
  const [payments, setPayments] = useState<PaymentOption[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [existing, setExisting] = useState<ExistingAllocation[]>([]);
  const [lines, setLines] = useState<NewLine[]>([{ invoiceId: '', amount: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isOpen) return;
    setSelectedPaymentId(initialPaymentId ?? '');
    setLines([{ invoiceId: '', amount: '' }]);
    setExisting([]);
    setFormError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, initialPaymentId]);

  useEffect(() => {
    if (!isOpen || !customerId) return;
    const load = async () => {
      try {
        setLoading(true);
        const [paymentsRes, invoicesRes] = await Promise.all([
          fetch(`/api/customers/${customerId}/payments`).then((r) => r.json()),
          fetch(`/api/customers/${customerId}/open-invoices`).then((r) => r.json()),
        ]);
        if (paymentsRes.data) setPayments(paymentsRes.data);
        if (invoicesRes.data) setOpenInvoices(invoicesRes.data);
      } catch (error) {
        console.error('Failed to load allocation data', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, customerId]);

  // Load the selected payment's existing allocations so a PATCH (full-set replace) preserves them.
  useEffect(() => {
    if (!isOpen || !selectedPaymentId) return;
    let cancelled = false;
    fetch(`/api/payments/${selectedPaymentId}`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled || !res.data) return;
        setExisting(res.data.allocations ?? []);
      })
      .catch((error) => console.error('Failed to load payment allocations', error));
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedPaymentId]);

  const availablePayments = useMemo(
    () => payments.filter((p) => p.status !== 'VOID' && Number(p.onAccount) > 0.005),
    [payments]
  );

  const selectedPayment = payments.find((p) => p.id === selectedPaymentId);
  const onAccountAvailable = selectedPayment ? Number(selectedPayment.onAccount) : 0;

  const existingInvoiceAllocations = useMemo(
    () => existing.filter((a) => a.invoiceId !== null),
    [existing]
  );

  const newTotal = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const overAllocated = newTotal > onAccountAvailable + 0.005;

  if (!isOpen) return null;

  const updateLine = (index: number, patch: Partial<NewLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === index ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { invoiceId: '', amount: '' }]);
  const removeLine = (index: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));

  const isFormValid =
    selectedPaymentId !== '' &&
    !overAllocated &&
    lines.some((l) => l.invoiceId !== '' && Number(l.amount) > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    // Full replacement set: keep existing invoice allocations, add the new ones.
    // The remainder is left implicit as on-account (derived).
    const allocations = [
      ...existingInvoiceAllocations.map((a) => ({
        invoiceId: a.invoiceId,
        amount: Number(a.amount),
      })),
      ...lines
        .filter((l) => l.invoiceId !== '' && Number(l.amount) > 0)
        .map((l) => ({ invoiceId: l.invoiceId, amount: Number(l.amount) })),
    ];

    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await fetch(`/api/payments/${selectedPaymentId}/allocations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations }),
      });

      const result = await res.json();
      if (!res.ok) {
        setFormError(result.error?.message || 'Failed to allocate payment');
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to allocate payment', error);
      setFormError('An unexpected error occurred while allocating the payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-surface-container animate-in zoom-in-95 relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-[0.5px] border-[#333] shadow-2xl duration-200">
        <div className="border-outline-variant flex items-center justify-between border-b-[0.5px] p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 text-primary flex h-10 w-10 items-center justify-center rounded-full">
              <span className="material-symbols-outlined">sync_alt</span>
            </div>
            <div>
              <h2 className="font-title-md text-title-md text-primary">Apply On-Account Credit</h2>
              {customerName && (
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  For: <span className="font-medium">{customerName}</span>
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

            {loading ? (
              <div className="text-on-surface-variant flex items-center justify-center gap-2 p-12">
                <span className="material-symbols-outlined animate-spin text-[24px]">
                  progress_activity
                </span>
                Loading payments and invoices...
              </div>
            ) : availablePayments.length === 0 ? (
              <div className="text-on-surface-variant flex flex-col items-center gap-2 p-12 text-center">
                <span className="material-symbols-outlined text-[40px]">info</span>
                <p className="text-body-md">
                  This customer has no payments with on-account credit to apply.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Payment
                  </label>
                  <select
                    value={selectedPaymentId}
                    onChange={(e) => setSelectedPaymentId(e.target.value)}
                    className="bg-surface-container-low border-outline-variant text-body-md text-primary focus:border-secondary w-full rounded-xl border-[0.5px] p-3.5 outline-none"
                  >
                    <option value="">Select a payment</option>
                    {availablePayments.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.mode.replace('_', ' ')} · {formatINR(p.onAccount)} on account ·{' '}
                        {new Date(p.date).toLocaleDateString('en-IN')}
                      </option>
                    ))}
                  </select>
                  {selectedPayment && (
                    <span className="text-on-surface-variant text-[12px]">
                      On-account available:{' '}
                      <span className="text-secondary font-semibold">
                        {formatINR(onAccountAvailable)}
                      </span>
                    </span>
                  )}
                </div>

                {existingInvoiceAllocations.length > 0 && (
                  <div className="border-outline-variant rounded-xl border-[0.5px] p-3">
                    <p className="text-on-surface-variant mb-2 text-[11px] uppercase">
                      Already applied
                    </p>
                    {existingInvoiceAllocations.map((a, i) => (
                      <div key={i} className="flex justify-between py-0.5 text-[13px]">
                        <span className="text-primary">{a.invoiceNo ?? '—'}</span>
                        <span className="font-data-tabular text-on-surface-variant">
                          {formatINR(a.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedPaymentId && (
                  <div className="space-y-3">
                    <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                      Apply to invoices
                    </label>
                    {lines.map((line, index) => (
                      <div
                        key={index}
                        className="border-outline-variant bg-surface-container-low grid grid-cols-[1fr_140px_auto] items-end gap-3 rounded-xl border-[0.5px] p-3"
                      >
                        <div className="flex flex-col gap-1.5">
                          <select
                            value={line.invoiceId}
                            onChange={(e) => updateLine(index, { invoiceId: e.target.value })}
                            className="bg-surface-container-lowest border-outline-variant text-body-sm text-primary focus:border-secondary w-full rounded-lg border-[0.5px] p-2.5 outline-none"
                          >
                            <option value="">Select invoice</option>
                            {openInvoices.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.invoiceNo ?? '—'} · Due {formatINR(inv.balanceDue)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={line.amount}
                          onChange={(e) => updateLine(index, { amount: e.target.value })}
                          placeholder="Amount"
                          className="bg-surface-container-lowest border-outline-variant text-body-sm text-primary focus:border-secondary w-full rounded-lg border-[0.5px] p-2.5 text-right outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          disabled={lines.length === 1}
                          className="text-on-surface-variant hover:text-error pb-1.5 transition-colors disabled:opacity-30"
                          title="Remove line"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addLine}
                      className="text-secondary hover:text-primary font-body-md flex items-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      Add Allocation Line
                    </button>
                    {overAllocated && (
                      <p className="text-error text-[12px]">
                        New allocations exceed the on-account credit available.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-surface-container-high border-outline-variant flex items-center justify-between gap-3 border-t-[0.5px] p-6">
            <div className="text-body-md text-on-surface-variant">
              To apply:{' '}
              <span
                className={`font-data-tabular font-bold ${overAllocated ? 'text-error' : 'text-primary'}`}
              >
                {formatINR(newTotal)}
              </span>
            </div>
            <div className="flex gap-3">
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
                {isSubmitting ? 'Applying...' : 'Apply Credit'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
