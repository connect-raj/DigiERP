'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DetailCard } from '@/components/ui/DetailCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { RegistrationMark } from '@/components/ui/RegistrationMark';

type InquiryStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';

type Inquiry = {
  id: string;
  source: 'WEBSITE' | 'EXPO' | 'INDIAMART' | 'TRADEINDIA' | 'MANUAL';
  status: InquiryStatus;
  company: string;
  contactName: string;
  phone: string;
  email: string | null;
  city: string | null;
  interestCategory: 'INK' | 'LARGE_FORMAT_PRINTER' | 'NOT_SURE';
  inkType: 'UV' | 'SOLVENT' | 'ECO_SOLVENT' | null;
  volume: string | null;
  printerBrand: string | null;
  currentSupplier: string | null;
  notes: string | null;
  convertedCustomerId: string | null;
  createdAt: string;
};

const NEXT_STATUS: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: ['CONTACTED', 'CLOSED'],
  CONTACTED: ['CLOSED'],
  CONVERTED: [],
  CLOSED: [],
};

function formatDate(val: string) {
  return new Date(val).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function humanize(val: string) {
  return val
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [existingMatch, setExistingMatch] = useState<{ id: string; firmName: string } | null>(null);
  const [convertState, setConvertState] = useState('');
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  const fetchInquiry = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inquiries/${id}`);
      const data = await res.json();
      if (!res.ok || !data.data) {
        setError(data.error?.message || 'Failed to fetch inquiry');
        return;
      }
      setInquiry(data.data);
    } catch (err) {
      console.error('Failed to load inquiry', err);
      setError('Failed to load inquiry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInquiry();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (status: InquiryStatus) => {
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error?.message || 'Failed to update status');
      } else {
        setInquiry(data.data);
      }
    } catch (err) {
      console.error('Failed to update status', err);
      alert('An unexpected error occurred.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openConvertModal = async () => {
    setConvertError(null);
    setConvertState('');
    setIsConvertModalOpen(true);
    try {
      const res = await fetch(`/api/inquiries/${id}/convert`);
      const data = await res.json();
      setExistingMatch(res.ok ? (data.data?.existingMatch ?? null) : null);
    } catch (err) {
      console.error('Failed to check existing customer match', err);
      setExistingMatch(null);
    }
  };

  const handleConvert = async () => {
    if (!convertState.trim()) {
      setConvertError('State is required');
      return;
    }
    try {
      setConverting(true);
      setConvertError(null);
      const res = await fetch(`/api/inquiries/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: convertState.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConvertError(data.error?.message || 'Failed to convert inquiry');
        return;
      }
      setIsConvertModalOpen(false);
      const customerId = data.data.customer.id;
      router.push(`/customers/${customerId}`);
    } catch (err) {
      console.error('Failed to convert inquiry', err);
      setConvertError('An unexpected error occurred.');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-on-surface-variant flex h-full items-center justify-center p-12">
        <RegistrationMark size="lg" spinning />
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-status-error text-[48px]">error</span>
        <p className="text-on-surface font-semibold">{error || 'Inquiry not found'}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/inquiries')}>
          Back to list
        </Button>
      </div>
    );
  }

  const canConvert = inquiry.status === 'NEW' || inquiry.status === 'CONTACTED';
  const nextStatuses = NEXT_STATUS[inquiry.status];

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/inquiries')}>
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-on-surface text-xl font-semibold tracking-tight">
                {inquiry.company}
              </h1>
              <StatusPill status={inquiry.status} />
            </div>
            <p className="text-on-surface-variant mt-0.5 text-sm">
              Received {formatDate(inquiry.createdAt)} via {humanize(inquiry.source)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {nextStatuses.length > 0 && (
            <select
              className="bg-surface-container-low border-border text-on-surface h-8 cursor-pointer rounded-lg border px-3 text-sm focus:outline-none disabled:opacity-50"
              value={inquiry.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value as InquiryStatus)}
            >
              <option value={inquiry.status}>{humanize(inquiry.status)}</option>
              {nextStatuses.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>
          )}
          {canConvert && (
            <Button size="sm" onClick={openConvertModal}>
              Convert to Customer
            </Button>
          )}
          {inquiry.convertedCustomerId && (
            <Button asChild variant="outline" size="sm">
              <a href={`/customers/${inquiry.convertedCustomerId}`}>View Customer</a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DetailCard title="Contact">
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-on-surface-variant text-xs">Contact Person</dt>
              <dd className="font-medium">{inquiry.contactName}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-on-surface-variant text-xs">Phone</dt>
                <dd className="font-mono">{inquiry.phone}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">Email</dt>
                <dd>{inquiry.email || '—'}</dd>
              </div>
            </div>
            <div>
              <dt className="text-on-surface-variant text-xs">City</dt>
              <dd>{inquiry.city || '—'}</dd>
            </div>
          </dl>
        </DetailCard>

        <DetailCard title="Requirement">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-on-surface-variant text-xs">Interest</dt>
                <dd className="font-medium">{humanize(inquiry.interestCategory)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">Ink Type</dt>
                <dd>{inquiry.inkType ? humanize(inquiry.inkType) : '—'}</dd>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-on-surface-variant text-xs">Volume</dt>
                <dd>{inquiry.volume || '—'}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant text-xs">Printer Brand</dt>
                <dd>{inquiry.printerBrand || '—'}</dd>
              </div>
            </div>
            <div>
              <dt className="text-on-surface-variant text-xs">Current Supplier</dt>
              <dd>{inquiry.currentSupplier || '—'}</dd>
            </div>
          </dl>
        </DetailCard>
      </div>

      {inquiry.notes && (
        <DetailCard title="Notes">
          <p className="text-on-surface text-sm whitespace-pre-wrap">{inquiry.notes}</p>
        </DetailCard>
      )}

      {isConvertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="border-border bg-surface-container flex w-full max-w-md flex-col gap-4 rounded-xl border p-6 shadow-2xl">
            <h3 className="text-on-surface font-display text-lg font-semibold">
              Convert to Customer
            </h3>

            {existingMatch && (
              <div className="border-status-warning/30 bg-status-warning/10 text-status-warning flex items-start gap-2 rounded-lg border p-3 text-sm">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span>
                  Possible existing customer: <strong>{existingMatch.firmName}</strong>. This will
                  still create a new, separate Customer record.
                </span>
              </div>
            )}

            <div>
              <label className="text-on-surface-variant mb-1 block text-xs uppercase">State</label>
              <input
                type="text"
                className="bg-surface-container-low border-border text-on-surface w-full rounded-lg border p-2.5 text-sm outline-none"
                placeholder="e.g. Maharashtra"
                value={convertState}
                onChange={(e) => setConvertState(e.target.value)}
              />
            </div>

            {convertError && <p className="text-status-error text-sm">{convertError}</p>}

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConvertModalOpen(false)}
                disabled={converting}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleConvert} disabled={converting}>
                {converting ? 'Converting…' : 'Create Customer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
