'use client';

import React, { useState } from 'react';

type RecordPaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseId: string;
  purchaseNo: string;
  pendingBalance: number;
};

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  purchaseId,
  purchaseNo,
  pendingBalance,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState<string>(pendingBalance.toString());
  const [mode, setMode] = useState<string>('BANK_TRANSFER');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/purchases/${purchaseId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          mode,
          reference: reference || undefined,
          date: new Date(date).toISOString(),
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (error) {
      console.error('Failed to record payment', error);
      alert('Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Content */}
      <div className="bg-surface-container animate-in zoom-in-95 relative w-full max-w-lg overflow-hidden rounded-2xl border-[0.5px] border-[#333] shadow-2xl duration-200">
        {/* Modal Header */}
        <div className="border-outline-variant flex items-center justify-between border-b-[0.5px] p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 text-primary flex h-10 w-10 items-center justify-center rounded-full">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <div>
              <h2 className="font-title-md text-title-md text-primary">Record Payment</h2>
              <p className="text-body-sm text-on-surface-variant mt-0.5">
                For PO: <span className="font-data-tabular">{purchaseNo}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Balance Alert */}
            <div className="mb-6 flex items-center justify-between rounded-xl border-[0.5px] border-orange-400/20 bg-orange-400/10 p-4">
              <div className="flex items-center gap-2 text-orange-400">
                <span className="material-symbols-outlined text-[20px]">info</span>
                <span className="font-body-md font-semibold">Pending Balance</span>
              </div>
              <span className="font-display text-[20px] font-bold text-orange-400">
                ₹{pendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-5">
              {/* Amount Input */}
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={pendingBalance}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-surface-container-low border-outline-variant text-body-md text-primary focus:border-secondary w-full rounded-xl border-[0.5px] p-3.5 transition-colors outline-none"
                />
              </div>

              {/* Payment Mode */}
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['BANK_TRANSFER', 'UPI', 'CASH'].map((m) => (
                    <div
                      key={m}
                      onClick={() => setMode(m)}
                      className={`cursor-pointer rounded-xl border-[0.5px] p-3 text-center transition-all ${mode === m ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-[#8e9192]'}`}
                    >
                      <span className="material-symbols-outlined mb-1 text-[24px]">
                        {m === 'BANK_TRANSFER'
                          ? 'account_balance'
                          : m === 'UPI'
                            ? 'qr_code_scanner'
                            : 'payments'}
                      </span>
                      <p className="font-label-caps text-[11px] font-bold tracking-wider">
                        {m.replace('_', ' ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date & Reference Grid */}
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

          {/* Modal Footer */}
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
              disabled={isSubmitting}
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
