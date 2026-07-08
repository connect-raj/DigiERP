'use client';

import React, { useState, useEffect, useMemo } from 'react';

type PaymentOption = {
  id: string;
  amount: string | number;
  unallocatedAmount: string | number;
  mode: string;
  reference: string | null;
  date: string;
};

type InvoiceOption = {
  id: string;
  invoiceNo: string;
  date: string;
  totalAmount: string | number;
  paidAmount: string | number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
};

type AllocationLine = {
  paymentId: string;
  invoiceId: string;
  amount: string;
};

type AllocatePaymentsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerId: string;
  customerName?: string;
  initialPaymentId?: string;
  initialInvoiceId?: string;
};

function formatINR(val: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function emptyLine(paymentId = '', invoiceId = ''): AllocationLine {
  return { paymentId, invoiceId, amount: '' };
}

export default function AllocatePaymentsModal({
  isOpen,
  onClose,
  onSuccess,
  customerId,
  customerName,
  initialPaymentId,
  initialInvoiceId,
}: AllocatePaymentsModalProps) {
  const [payments, setPayments] = useState<PaymentOption[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<AllocationLine[]>([emptyLine()]);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isOpen) return;
    setLines([emptyLine(initialPaymentId ?? '', initialInvoiceId ?? '')]);
    setFormError(null);
    setIdempotencyKey(crypto.randomUUID());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, initialPaymentId, initialInvoiceId]);

  useEffect(() => {
    if (!isOpen || !customerId) return;

    const load = async () => {
      try {
        setLoading(true);
        const [paymentsRes, invoicesRes] = await Promise.all([
          fetch(`/api/customers/${customerId}/payments`),
          fetch(`/api/invoices?customerId=${customerId}`),
        ]);
        const paymentsData = await paymentsRes.json();
        const invoicesData = await invoicesRes.json();
        if (paymentsData.data) setPayments(paymentsData.data);
        if (invoicesData.data) setInvoices(invoicesData.data);
      } catch (error) {
        console.error('Failed to load allocation data', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, customerId]);

  const availablePayments = useMemo(
    () => payments.filter((p) => Number(p.unallocatedAmount) > 0),
    [payments]
  );
  const outstandingInvoices = useMemo(
    () => invoices.filter((i) => i.paymentStatus !== 'PAID'),
    [invoices]
  );

  const remainingForPayment = (paymentId: string, excludeIndex: number) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return 0;
    const staged = lines.reduce(
      (sum, line, idx) =>
        idx !== excludeIndex && line.paymentId === paymentId
          ? sum + (Number(line.amount) || 0)
          : sum,
      0
    );
    return Number(payment.unallocatedAmount) - staged;
  };

  const remainingForInvoice = (invoiceId: string, excludeIndex: number) => {
    const invoice = invoices.find((i) => i.id === invoiceId);
    if (!invoice) return 0;
    const pending = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    const staged = lines.reduce(
      (sum, line, idx) =>
        idx !== excludeIndex && line.invoiceId === invoiceId
          ? sum + (Number(line.amount) || 0)
          : sum,
      0
    );
    return pending - staged;
  };

  if (!isOpen) return null;

  const updateLine = (index: number, patch: Partial<AllocationLine>) => {
    setLines((prev) => prev.map((line, idx) => (idx === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (index: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));

  const totalAllocated = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  const isFormValid =
    lines.length > 0 &&
    lines.every(
      (line, idx) =>
        line.paymentId !== '' &&
        line.invoiceId !== '' &&
        Number(line.amount) > 0 &&
        Number(line.amount) <= remainingForPayment(line.paymentId, idx) + 1e-6 &&
        Number(line.amount) <= remainingForInvoice(line.invoiceId, idx) + 1e-6
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await fetch('/api/payments/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          allocations: lines.map((line) => ({
            paymentId: line.paymentId,
            invoiceId: line.invoiceId,
            amount: Number(line.amount),
          })),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        const details = result.error?.details;
        const detailMsg =
          Array.isArray(details) && details.length > 0
            ? ` (${details
                .map((d: { reason?: string }) => d.reason)
                .filter(Boolean)
                .join(', ')})`
            : '';
        setFormError((result.error?.message || 'Failed to allocate payment') + detailMsg);
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

      <div className="bg-surface-container animate-in zoom-in-95 relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-[0.5px] border-[#333] shadow-2xl duration-200">
        <div className="border-outline-variant flex items-center justify-between border-b-[0.5px] p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 text-primary flex h-10 w-10 items-center justify-center rounded-full">
              <span className="material-symbols-outlined">sync_alt</span>
            </div>
            <div>
              <h2 className="font-title-md text-title-md text-primary">
                Allocate Payments to Invoices
              </h2>
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

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
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
            ) : availablePayments.length === 0 || outstandingInvoices.length === 0 ? (
              <div className="text-on-surface-variant flex flex-col items-center gap-2 p-12 text-center">
                <span className="material-symbols-outlined text-[40px]">info</span>
                <p className="text-body-md">
                  {availablePayments.length === 0
                    ? 'This customer has no payments with available balance to allocate.'
                    : 'This customer has no outstanding invoices to allocate against.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {lines.map((line, index) => {
                  const remainingPayment = line.paymentId
                    ? remainingForPayment(line.paymentId, index)
                    : null;
                  const remainingInvoice = line.invoiceId
                    ? remainingForInvoice(line.invoiceId, index)
                    : null;
                  const amountInvalid =
                    Number(line.amount) > 0 &&
                    ((remainingPayment !== null && Number(line.amount) > remainingPayment + 1e-6) ||
                      (remainingInvoice !== null && Number(line.amount) > remainingInvoice + 1e-6));

                  return (
                    <div
                      key={index}
                      className="border-outline-variant bg-surface-container-low grid grid-cols-1 gap-3 rounded-xl border-[0.5px] p-4 md:grid-cols-[1fr_1fr_140px_auto] md:items-start"
                    >
                      <div className="flex flex-col gap-1.5">
                        <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                          Payment
                        </label>
                        <select
                          value={line.paymentId}
                          onChange={(e) => updateLine(index, { paymentId: e.target.value })}
                          className="bg-surface-container-lowest border-outline-variant text-body-md text-primary focus:border-secondary w-full rounded-lg border-[0.5px] p-2.5 outline-none"
                        >
                          <option value="">Select payment</option>
                          {availablePayments.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.mode.replace('_', ' ')} · {formatINR(p.unallocatedAmount)} avail. ·{' '}
                              {new Date(p.date).toLocaleDateString('en-IN')}
                            </option>
                          ))}
                        </select>
                        {remainingPayment !== null && (
                          <span className="text-on-surface-variant text-[11px]">
                            Remaining: {formatINR(Math.max(remainingPayment, 0))}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                          Invoice
                        </label>
                        <select
                          value={line.invoiceId}
                          onChange={(e) => updateLine(index, { invoiceId: e.target.value })}
                          className="bg-surface-container-lowest border-outline-variant text-body-md text-primary focus:border-secondary w-full rounded-lg border-[0.5px] p-2.5 outline-none"
                        >
                          <option value="">Select invoice</option>
                          {outstandingInvoices.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.invoiceNo} · Pending{' '}
                              {formatINR(Number(inv.totalAmount) - Number(inv.paidAmount))}
                            </option>
                          ))}
                        </select>
                        {remainingInvoice !== null && (
                          <span className="text-on-surface-variant text-[11px]">
                            Pending: {formatINR(Math.max(remainingInvoice, 0))}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                          Amount (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={line.amount}
                          onChange={(e) => updateLine(index, { amount: e.target.value })}
                          className={`bg-surface-container-lowest text-body-md text-primary w-full rounded-lg border-[0.5px] p-2.5 outline-none ${
                            amountInvalid
                              ? 'border-error'
                              : 'border-outline-variant focus:border-secondary'
                          }`}
                        />
                        {amountInvalid && (
                          <span className="text-error text-[11px]">Exceeds available balance</span>
                        )}
                      </div>

                      <div className="flex items-start justify-end pt-6 md:pt-[26px]">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          disabled={lines.length === 1}
                          className="text-on-surface-variant hover:text-error transition-colors disabled:opacity-30"
                          title="Remove line"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addLine}
                  className="text-secondary hover:text-primary font-body-md flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Add Allocation Line
                </button>
              </div>
            )}
          </div>

          <div className="bg-surface-container-high border-outline-variant flex items-center justify-between gap-3 border-t-[0.5px] p-6">
            <div className="text-body-md text-on-surface-variant">
              Total to allocate:{' '}
              <span className="text-primary font-data-tabular font-bold">
                {formatINR(totalAllocated)}
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
                {isSubmitting ? 'Allocating...' : 'Confirm Allocation'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
