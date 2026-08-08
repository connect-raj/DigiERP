'use client';

import React, { useState, useEffect } from 'react';
import { FieldLabel, FormField, SubmitError, TextInput } from '@/components/ui/form';

export type Customer = {
  id: string;
  firmName: string;
  contactPerson?: string | null;
  address?: string | null;
  city?: string | null;
  state: string;
  gstin?: string | null;
  phone?: string | null;
  email?: string | null;
  billingMode?: 'BILL_WISE' | 'OPEN_BALANCE';
  // derived: positive = owed by customer, negative = on-account credit
  pendingTotal?: string | number;
  creditLimit: string | number;
};

type FormState = {
  firmName: string;
  contactPerson: string;
  address: string;
  city: string;
  state: string;
  gstin: string;
  phone: string;
  email: string;
  creditLimit: string;
};

const EMPTY_FORM: FormState = {
  firmName: '',
  contactPerson: '',
  address: '',
  city: '',
  state: '',
  gstin: '',
  phone: '',
  email: '',
  creditLimit: '0',
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatINR(val: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(val));
}

export default function CustomerFormDrawer({
  isOpen,
  onClose,
  onSuccess,
  editingCustomer,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCustomer: Customer | null;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isOpen) return;
    if (editingCustomer) {
      setForm({
        firmName: editingCustomer.firmName,
        contactPerson: editingCustomer.contactPerson || '',
        address: editingCustomer.address || '',
        city: editingCustomer.city || '',
        state: editingCustomer.state,
        gstin: editingCustomer.gstin || '',
        phone: editingCustomer.phone || '',
        email: editingCustomer.email || '',
        creditLimit: editingCustomer.creditLimit.toString(),
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setSubmitError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, editingCustomer]);

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.firmName.trim()) next.firmName = 'Firm name is required.';
    if (!form.state.trim()) next.state = 'State is required.';
    if (form.gstin.trim() && !GSTIN_REGEX.test(form.gstin.trim())) {
      next.gstin = 'Invalid GSTIN.';
    }
    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      next.email = 'Invalid email.';
    }
    if (form.creditLimit.trim() && Number(form.creditLimit) < 0) {
      next.creditLimit = 'Credit limit must be >= 0.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const payload = {
        firmName: form.firmName.trim(),
        state: form.state.trim(),
        contactPerson: form.contactPerson.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        gstin: form.gstin.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        creditLimit: form.creditLimit.trim() ? Number(form.creditLimit) : undefined,
      };

      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        setSubmitError(result.error?.message || 'Failed to save customer.');
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save customer', error);
      setSubmitError('An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`bg-surface-container-high border-outline-variant fixed top-0 right-0 z-[60] flex h-full w-full max-w-[450px] flex-col border-l-[0.5px] shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="border-outline-variant flex items-center justify-between border-b-[0.5px] p-6">
          <h2 className="font-headline-md text-headline-md text-primary">
            {editingCustomer ? `Edit Customer — ${editingCustomer.firmName}` : 'Add Customer'}
          </h2>
          <button
            className="text-on-surface-variant hover:text-primary transition-colors"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
          id="customer-form"
        >
          <div className="flex-1 space-y-6 p-6">
            {editingCustomer &&
              (() => {
                const pending = Number(editingCustomer.pendingTotal ?? 0);
                return (
                  <div className="bg-surface-container-lowest border-outline-variant rounded border-[0.5px] p-4">
                    <p className="text-body-md text-on-surface-variant">
                      Outstanding Balance:{' '}
                      <span className="font-bold text-amber-400">
                        {formatINR(Math.max(0, pending))}
                      </span>
                    </p>
                    <p className="text-body-md text-on-surface-variant mt-1">
                      On-Account Credit:{' '}
                      <span className="text-secondary font-bold">
                        {formatINR(Math.max(0, -pending))}
                      </span>
                    </p>
                    <p className="text-on-surface-variant mt-1 text-[12px] opacity-70">
                      Derived live from invoices and payments — not editable here.
                    </p>
                  </div>
                );
              })()}

            <SubmitError>{submitError}</SubmitError>

            <div className="space-y-4">
              <FieldLabel className="tracking-widest uppercase">General Information</FieldLabel>
              <FormField label="Firm Name" required error={errors.firmName}>
                <TextInput
                  placeholder="e.g. Shree Ganesh Printers"
                  value={form.firmName}
                  invalid={!!errors.firmName}
                  onChange={(e) => setForm({ ...form, firmName: e.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Contact Person">
                  <TextInput
                    placeholder="e.g. Rajesh Mehra"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  />
                </FormField>
                <FormField label="Phone">
                  <TextInput
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </FormField>
              </div>
              <FormField label="Email" error={errors.email}>
                <TextInput
                  type="email"
                  placeholder="accounts@company.com"
                  value={form.email}
                  invalid={!!errors.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </FormField>
            </div>

            <div className="space-y-4">
              <FieldLabel className="tracking-widest uppercase">Location &amp; Tax</FieldLabel>
              <FormField label="Address">
                <TextInput
                  placeholder="Plot 42, GIDC"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="City">
                  <TextInput
                    placeholder="Ahmedabad"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </FormField>
                <FormField label="State" required error={errors.state}>
                  <TextInput
                    placeholder="Gujarat"
                    value={form.state}
                    invalid={!!errors.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                </FormField>
              </div>
              <FormField label="GSTIN" error={errors.gstin}>
                <TextInput
                  className="font-mono uppercase"
                  placeholder="24AAAAA0000A1Z5"
                  value={form.gstin}
                  invalid={!!errors.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                />
              </FormField>
              <FormField label="Credit Limit" error={errors.creditLimit}>
                <div className="relative">
                  <span className="text-on-surface-variant absolute top-1/2 left-3 -translate-y-1/2">
                    ₹
                  </span>
                  <TextInput
                    className="pl-8"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.creditLimit}
                    invalid={!!errors.creditLimit}
                    onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                  />
                </div>
              </FormField>
            </div>
          </div>

          <div className="border-outline-variant bg-surface-container-highest flex gap-3 border-t-[0.5px] p-6">
            <button
              type="button"
              className="border-outline text-on-surface hover:bg-surface-variant flex-1 rounded border-[0.5px] py-2.5 font-bold transition-colors"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary text-on-primary flex-1 rounded py-2.5 font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingCustomer ? 'Update Record' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
