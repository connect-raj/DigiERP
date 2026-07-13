'use client';

import React, { useState, useEffect } from 'react';

type CustomerOption = { id: string; firmName: string };

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

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isOpen) return;
    setCustomerId(lockedCustomerId ?? '');
    setAmount('');
    setMode('BANK_TRANSFER');
    setDate(new Date().toISOString().split('T')[0]);
    setReference('');
    setFormError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, lockedCustomerId]);

  useEffect(() => {
    if (!isOpen || lockedCustomerId) return;
    // Customer picker needs the full list, not a paginated page.
    fetch('/api/customers?limit=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setCustomers(data.data);
      })
      .catch((error) => console.error('Failed to fetch customers', error));
  }, [isOpen, lockedCustomerId]);

  if (!isOpen) return null;

  const isFormValid = customerId !== '' && Number(amount) > 0 && date !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          amount: Number(amount),
          mode,
          reference: reference.trim() || undefined,
          date: new Date(date).toISOString(),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-surface-container animate-in zoom-in-95 relative w-full max-w-lg overflow-hidden rounded-2xl border-[0.5px] border-[#333] shadow-2xl duration-200">
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

        <form onSubmit={handleSubmit}>
          <div className="p-6">
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
