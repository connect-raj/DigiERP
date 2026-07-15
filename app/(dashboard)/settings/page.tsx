'use client';

import React, { useState, useEffect } from 'react';

type Settings = {
  companyName: string;
  companyAddress: string;
  companyState: string;
  companyGstin: string;
  companyPan: string | null;
  financialYearStart: number;
};

const EMPTY_FORM: Settings = {
  companyName: '',
  companyAddress: '',
  companyState: '',
  companyGstin: '',
  companyPan: '',
  financialYearStart: 4,
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function SettingsPage() {
  const [form, setForm] = useState<Settings>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.data) {
          setForm({
            companyName: data.data.companyName ?? '',
            companyAddress: data.data.companyAddress ?? '',
            companyState: data.data.companyState ?? '',
            companyGstin: data.data.companyGstin ?? '',
            companyPan: data.data.companyPan ?? '',
            financialYearStart: data.data.financialYearStart ?? 4,
          });
        }
      } catch (error) {
        console.error('Failed to fetch settings', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (field: keyof Settings, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          companyPan: form.companyPan?.trim() ? form.companyPan.trim() : null,
          financialYearStart: Number(form.financialYearStart),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message ?? 'Failed to save settings');
      }
      setSuccessMessage('Company settings saved.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border-[0.5px] border-[#444] bg-[#1c1c1c] px-3 py-2 text-[13px] text-primary outline-none focus:border-[#666]';
  const labelClass = 'mb-1.5 block text-[12px] font-medium text-on-surface-variant';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Company Settings</h1>
        <p className="text-on-surface-variant mt-1 text-[13px]">
          These details drive tax invoices, GST computation, and the financial-year document
          numbering. Keep them accurate.
        </p>
      </div>

      {loading ? (
        <p className="text-on-surface-variant text-[13px]">Loading…</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] p-6"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Company Name</label>
              <input
                className={inputClass}
                value={form.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Company Address</label>
              <textarea
                className={inputClass}
                rows={3}
                value={form.companyAddress}
                onChange={(e) => handleChange('companyAddress', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input
                className={inputClass}
                value={form.companyState}
                onChange={(e) => handleChange('companyState', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>GSTIN</label>
              <input
                className={inputClass}
                value={form.companyGstin}
                onChange={(e) => handleChange('companyGstin', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>PAN (optional)</label>
              <input
                className={inputClass}
                value={form.companyPan ?? ''}
                onChange={(e) => handleChange('companyPan', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Financial Year Start Month</label>
              <select
                className={inputClass}
                value={form.financialYearStart}
                onChange={(e) => handleChange('financialYearStart', Number(e.target.value))}
              >
                {MONTHS.map((month, idx) => (
                  <option key={month} value={idx + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && <p className="mt-4 text-[13px] text-red-400">{formError}</p>}
          {successMessage && <p className="mt-4 text-[13px] text-green-400">{successMessage}</p>}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="text-primary rounded-lg border-[0.5px] border-[#444] bg-[#2a2a2a] px-5 py-2 text-[13px] font-medium transition-all hover:bg-[#333] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
