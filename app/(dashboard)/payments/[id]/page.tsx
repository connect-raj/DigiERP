'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AllocatePaymentsModal from '../_components/AllocatePaymentsModal';
import { RegistrationMark } from '@/components/ui/RegistrationMark';
import { DetailCard } from '@/components/ui/DetailCard';
import { Button } from '@/components/ui/button';

type Allocation = {
  id: string;
  invoiceId: string | null;
  invoiceNo: string | null;
  amount: string | number;
  note?: string | null;
  createdAt: string;
};

type PaymentDetail = {
  id: string;
  customerId: string;
  customer: { id: string; firmName: string };
  amount: string | number;
  onAccount: string | number;
  mode: string;
  reference: string | null;
  status: 'ACTIVE' | 'VOID';
  date: string;
  createdAt: string;
  recordedBy: { id: string; username: string } | null;
  allocations: Allocation[];
};

function formatINR(val: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function formatDate(val: string) {
  return new Date(val).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);

  const fetchPayment = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payments/${id}`);
      const data = await res.json();
      if (!res.ok || !data.data) {
        setError(data.error?.message || 'Failed to load payment');
      } else {
        setPayment(data.data);
      }
    } catch (err) {
      console.error('Failed to load payment', err);
      setError('Failed to load payment.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPayment();
  }, [fetchPayment]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <RegistrationMark size="lg" spinning />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-status-error text-[48px]">error</span>
        <p className="text-on-surface font-semibold">{error || 'Payment not found'}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/payments')}>
          Back to Payments
        </Button>
      </div>
    );
  }

  const amount = Number(payment.amount);
  const unallocated = Number(payment.onAccount);
  const allocated = amount - unallocated;
  const isVoid = payment.status === 'VOID';

  const statusLabel = isVoid
    ? 'Voided'
    : unallocated <= 0
      ? 'Fully Allocated'
      : allocated > 0
        ? 'Partial'
        : 'On Account';
  const statusColor = isVoid
    ? 'bg-status-error/15 text-status-error'
    : unallocated <= 0
      ? 'bg-status-success/15 text-status-success'
      : allocated > 0
        ? 'bg-status-info/15 text-status-info'
        : 'bg-status-warning/15 text-status-warning';

  const handleVoid = async () => {
    if (!window.confirm('Void this payment? Balances will revert; the record is kept for audit.')) {
      return;
    }
    try {
      const res = await fetch(`/api/payments/${id}/void`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error?.message ?? 'Failed to void payment');
        return;
      }
      fetchPayment();
    } catch (err) {
      console.error('Failed to void payment', err);
      window.alert('Failed to void payment');
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="text-on-surface-variant font-body-sm flex items-center gap-2">
            <Link href="/payments" className="hover:text-primary transition-colors">
              Payments
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-medium">{formatDate(payment.date)}</span>
          </div>
          <div className="mt-1 flex items-center gap-4">
            <h1 className="font-display text-on-surface text-xl font-semibold tracking-tight">
              {formatINR(payment.amount)}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-[12px] font-bold tracking-wider uppercase ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isVoid && unallocated > 0 && (
            <Button size="sm" onClick={() => setIsAllocateModalOpen(true)}>
              <span className="material-symbols-outlined text-[18px]">sync_alt</span>
              Allocate to Invoices
            </Button>
          )}
          {!isVoid && (
            <Button variant="destructive" size="sm" onClick={handleVoid}>
              <span className="material-symbols-outlined text-[18px]">block</span>
              Void
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailCard title="Allocation History">
            {payment.allocations.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No allocations recorded yet.</p>
            ) : (
              <div className="border-border relative ml-3 space-y-8 border-l pb-4">
                {payment.allocations.map((allocation) => (
                  <div key={allocation.id} className="relative pl-8">
                    <div className="bg-accent-cyan border-surface-container-low absolute top-1.5 -left-1.5 h-3 w-3 rounded-full border-2"></div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/invoices/${allocation.invoiceId}`}
                          className="text-on-surface font-medium hover:underline"
                        >
                          {allocation.invoiceNo}
                        </Link>
                        <span className="text-accent-cyan font-mono text-[15px] font-bold">
                          - {formatINR(allocation.amount)}
                        </span>
                      </div>
                      <p className="text-on-surface-variant text-[13px]">
                        {formatDate(allocation.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="relative pl-8">
                  <div className="bg-outline border-surface-container-low absolute top-1.5 -left-1.5 h-3 w-3 rounded-full border-2"></div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface font-medium">Payment Recorded</span>
                      <span className="text-on-surface font-mono text-[15px] font-bold">
                        {formatINR(payment.amount)}
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-[13px]">
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DetailCard>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <DetailCard title="Financial Summary">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-on-surface font-bold">Amount Received</span>
                <span className="text-on-surface font-mono text-[18px] font-bold">
                  {formatINR(amount)}
                </span>
              </div>
              <div className="bg-surface-container-lowest mt-2 rounded-xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-on-surface-variant text-[13px]">Allocated</span>
                  <span className="text-accent-cyan font-mono font-semibold">
                    {formatINR(allocated)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant text-[13px]">Unallocated (Credit)</span>
                  <span className="text-status-warning font-mono font-semibold">
                    {formatINR(unallocated)}
                  </span>
                </div>
                <div className="bg-surface-container-highest mt-4 h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-accent-cyan h-full rounded-full transition-all duration-1000"
                    style={{ width: `${amount > 0 ? (allocated / amount) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </DetailCard>

          <DetailCard
            title="Customer"
            headerAside={
              <Link
                href={`/customers/${payment.customer.id}`}
                className="text-accent-cyan hover:text-on-surface text-[13px] font-medium transition-colors"
              >
                View Profile
              </Link>
            }
          >
            <h3 className="text-on-surface font-semibold">{payment.customer.firmName}</h3>
          </DetailCard>

          <DetailCard title="Payment Details">
            <div className="space-y-4 text-[13px]">
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
                <span className="text-on-surface">{payment.mode.replace('_', ' ')}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">tag</span>
                <span className="text-on-surface font-mono">{payment.reference || 'N/A'}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span className="text-on-surface">{formatDate(payment.date)}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">person</span>
                <span className="text-on-surface">{payment.recordedBy?.username || 'N/A'}</span>
              </div>
            </div>
          </DetailCard>
        </div>
      </div>

      <AllocatePaymentsModal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        onSuccess={fetchPayment}
        customerId={payment.customerId}
        customerName={payment.customer.firmName}
        initialPaymentId={payment.id}
      />
    </div>
  );
}
