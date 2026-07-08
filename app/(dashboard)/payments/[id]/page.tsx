'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AllocatePaymentsModal from '../_components/AllocatePaymentsModal';

type Allocation = {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  amount: string | number;
  createdAt: string;
};

type PaymentDetail = {
  id: string;
  customerId: string;
  customer: { id: string; firmName: string };
  amount: string | number;
  unallocatedAmount: string | number;
  mode: string;
  reference: string | null;
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
    fetchPayment();
  }, [fetchPayment]);

  if (loading) {
    return (
      <div className="text-on-surface-variant flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-secondary animate-spin text-[32px]">
            progress_activity
          </span>
          <span>Loading payment...</span>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-[48px] text-red-400">error</span>
        <p className="text-body-lg text-primary font-bold">{error || 'Payment not found'}</p>
        <button
          onClick={() => router.push('/payments')}
          className="bg-surface-container border-outline-variant text-primary text-body-sm rounded-lg border-[0.5px] px-4 py-2 transition-colors hover:bg-[#252525]"
        >
          Back to Payments
        </button>
      </div>
    );
  }

  const amount = Number(payment.amount);
  const unallocated = Number(payment.unallocatedAmount);
  const allocated = amount - unallocated;

  const statusLabel =
    unallocated <= 0 ? 'Fully Allocated' : allocated > 0 ? 'Partial' : 'Unallocated';
  const statusColor =
    unallocated <= 0
      ? 'bg-secondary/15 text-secondary'
      : allocated > 0
        ? 'bg-orange-400/15 text-orange-400'
        : 'bg-error/15 text-error';

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
            <h1 className="font-headline-md text-headline-md text-primary">
              {formatINR(payment.amount)}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-[12px] font-bold tracking-wider uppercase ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {unallocated > 0 && (
          <button
            onClick={() => setIsAllocateModalOpen(true)}
            className="bg-primary text-on-primary font-body-md flex items-center gap-2 rounded-lg px-5 py-2 font-semibold shadow-sm transition-all hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">sync_alt</span>
            Allocate to Invoices
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">history</span>
              Allocation History
            </h2>
            {payment.allocations.length === 0 ? (
              <p className="text-on-surface-variant text-body-sm text-center">
                No allocations recorded yet.
              </p>
            ) : (
              <div className="relative ml-3 space-y-8 border-l border-[#333] pb-4">
                {payment.allocations.map((allocation) => (
                  <div key={allocation.id} className="relative pl-8">
                    <div className="bg-secondary absolute top-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-[#1c1c1c]"></div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/invoices/${allocation.invoiceId}`}
                          className="font-body-md text-primary font-medium hover:underline"
                        >
                          {allocation.invoiceNo}
                        </Link>
                        <span className="font-data-tabular text-secondary text-[15px] font-bold">
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
                  <div className="absolute top-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-[#1c1c1c] bg-[#555]"></div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-body-md text-primary font-medium">
                        Payment Recorded
                      </span>
                      <span className="font-data-tabular text-primary text-[15px] font-bold">
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
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-5">Financial Summary</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-body-md text-primary font-bold">Amount Received</span>
                <span className="font-data-tabular text-primary text-[18px] font-bold">
                  {formatINR(amount)}
                </span>
              </div>
              <div className="bg-surface-container-lowest mt-2 rounded-xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-on-surface-variant text-[13px]">Allocated</span>
                  <span className="font-data-tabular text-secondary font-semibold">
                    {formatINR(allocated)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant text-[13px]">Unallocated (Credit)</span>
                  <span className="font-data-tabular font-semibold text-amber-400">
                    {formatINR(unallocated)}
                  </span>
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#222]">
                  <div
                    className="bg-secondary h-full rounded-full transition-all duration-1000"
                    style={{ width: `${amount > 0 ? (allocated / amount) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-title-md text-title-md text-primary">Customer</h2>
              <Link
                href={`/customers/${payment.customer.id}`}
                className="text-secondary hover:text-primary text-[13px] font-medium transition-colors"
              >
                View Profile
              </Link>
            </div>
            <h3 className="font-body-md text-primary font-semibold">{payment.customer.firmName}</h3>
          </div>

          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-5">Payment Details</h2>
            <div className="space-y-4 text-[13px]">
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
                <span className="text-primary">{payment.mode.replace('_', ' ')}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">tag</span>
                <span className="text-primary font-mono">{payment.reference || 'N/A'}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span className="text-primary">{formatDate(payment.date)}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">person</span>
                <span className="text-primary">{payment.recordedBy?.username || 'N/A'}</span>
              </div>
            </div>
          </div>
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
