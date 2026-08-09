'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AllocatePaymentsModal from '../../payments/_components/AllocatePaymentsModal';
import { RegistrationMark } from '@/components/ui/RegistrationMark';
import { DetailCard } from '@/components/ui/DetailCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill, type Status } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/button';

type InvoiceItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: string | number;
  price: string | number;
  cgst: string | number;
  sgst: string | number;
  igst: string | number;
  lineTotal: string | number;
};

type Invoice = {
  id: string;
  invoiceNo: string;
  date: string;
  place: string;
  transport?: string | null;
  totalAmount: string | number;
  totalCgst: string | number;
  totalSgst: string | number;
  totalIgst: string | number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  balanceDue: string | number;
  customer: {
    id: string;
    firmName: string;
    state: string;
    gstin?: string | null;
  };
  dispatchEntry: {
    id: string;
    challanNo: string;
    date: string;
  };
  items: InvoiceItem[];
};

type PaymentAllocation = {
  id: string;
  amount: string | number;
  createdAt: string;
  payment: {
    id: string;
    mode: string;
    reference: string | null;
    date: string;
  };
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

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const [invoiceRes, allocationsRes] = await Promise.all([
        fetch(`/api/invoices/${id}`),
        fetch(`/api/invoices/${id}/payments`),
      ]);
      const data = await invoiceRes.json();
      if (!invoiceRes.ok || !data.data) {
        setError(data.error?.message || 'Failed to load invoice');
        return;
      }
      setInvoice(data.data);

      const allocationsData = await allocationsRes.json();
      if (allocationsData.data) setAllocations(allocationsData.data);
    } catch (err) {
      console.error('Failed to load invoice', err);
      setError('Failed to load invoice.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvoice();
  }, [fetchInvoice]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <RegistrationMark size="lg" spinning />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-status-error text-[48px]">error</span>
        <p className="text-on-surface font-semibold">{error || 'Invoice not found'}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const paidAmt = Number(invoice.totalAmount) - Number(invoice.balanceDue);
  const pendingAmt = Number(invoice.balanceDue);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/invoices')}>
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-on-surface text-xl font-semibold tracking-tight">
              {invoice.invoiceNo}
            </h1>
            <StatusPill status={invoice.paymentStatus as Status} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download PDF
            </a>
          </Button>
          {invoice.paymentStatus !== 'PAID' && (
            <Button size="sm" onClick={() => setIsAllocateModalOpen(true)}>
              <span className="material-symbols-outlined text-[18px]">sync_alt</span>
              Allocate Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Document Preview */}
          <DetailCard title="Document Preview" contentClassName="p-0">
            <iframe
              src={`/api/invoices/${invoice.id}/pdf`}
              title={`Invoice ${invoice.invoiceNo}`}
              className="h-[600px] w-full bg-white"
            />
          </DetailCard>

          {/* Line Items Table */}
          <DetailCard title="Line Items" contentClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-container-high text-on-surface-variant border-border border-b text-[11px] font-medium tracking-widest uppercase">
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3 text-right">Quantity</th>
                    <th className="px-5 py-3 text-right">Price</th>
                    <th className="px-5 py-3 text-right">Tax</th>
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {invoice.items.map((item) => {
                    const tax = Number(item.cgst) + Number(item.sgst) + Number(item.igst);
                    return (
                      <tr key={item.id} className="hover:bg-surface-container transition-colors">
                        <td className="text-on-surface px-5 py-4 font-medium">
                          {item.productName}
                        </td>
                        <td className="text-on-surface px-5 py-4 text-right font-mono">
                          {Number(item.quantity)}
                        </td>
                        <td className="text-on-surface px-5 py-4 text-right font-mono">
                          {formatINR(item.price)}
                        </td>
                        <td className="text-on-surface px-5 py-4 text-right font-mono">
                          {tax > 0 ? formatINR(tax) : '—'}
                        </td>
                        <td className="text-on-surface px-5 py-4 text-right font-mono font-semibold">
                          {formatINR(item.lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DetailCard>

          {/* Payment Allocations */}
          <DetailCard title="Payment Allocations" contentClassName="p-0">
            {allocations.length === 0 ? (
              <EmptyState
                icon={<span className="material-symbols-outlined text-[40px]">sync_alt</span>}
                title="No payments allocated yet"
                description="Allocate a payment to this invoice to settle the balance."
              />
            ) : (
              <div className="divide-border divide-y">
                {allocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="hover:bg-surface-container flex items-center justify-between p-4 transition-colors"
                  >
                    <div>
                      <Link
                        href={`/payments/${allocation.payment.id}`}
                        className="text-on-surface font-semibold hover:underline"
                      >
                        {allocation.payment.mode.replace('_', ' ')}
                        {allocation.payment.reference ? ` · ${allocation.payment.reference}` : ''}
                      </Link>
                      <p className="text-on-surface-variant text-[12px]">
                        {formatDate(allocation.createdAt)}
                      </p>
                    </div>
                    <span className="text-accent-cyan font-mono font-semibold">
                      {formatINR(allocation.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <DetailCard title="Financial Summary">
            <div className="space-y-4">
              {Number(invoice.totalCgst) > 0 && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-on-surface-variant">CGST</span>
                  <span className="text-on-surface font-mono">{formatINR(invoice.totalCgst)}</span>
                </div>
              )}
              {Number(invoice.totalSgst) > 0 && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-on-surface-variant">SGST</span>
                  <span className="text-on-surface font-mono">{formatINR(invoice.totalSgst)}</span>
                </div>
              )}
              {Number(invoice.totalIgst) > 0 && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-on-surface-variant">IGST</span>
                  <span className="text-on-surface font-mono">{formatINR(invoice.totalIgst)}</span>
                </div>
              )}
              <div className="bg-border my-1 h-px w-full"></div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface font-bold">Grand Total</span>
                <span className="text-on-surface font-mono text-[18px] font-bold">
                  {formatINR(invoice.totalAmount)}
                </span>
              </div>

              <div className="bg-surface-container-lowest mt-2 rounded-xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-on-surface-variant text-[13px]">Amount Paid</span>
                  <span className="text-status-success font-mono font-semibold">
                    {formatINR(paidAmt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant text-[13px]">Pending Balance</span>
                  <span className="text-status-warning font-mono font-semibold">
                    {formatINR(pendingAmt)}
                  </span>
                </div>
                <div className="bg-surface-container-highest mt-4 h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-status-success h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Number(invoice.totalAmount) > 0 ? (paidAmt / Number(invoice.totalAmount)) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </DetailCard>

          <DetailCard
            title="Customer"
            headerAside={
              <Link
                href={`/customers/${invoice.customer.id}`}
                className="text-accent-cyan hover:text-on-surface text-[13px] font-medium transition-colors"
              >
                View Profile
              </Link>
            }
          >
            <h3 className="text-on-surface mb-3 font-semibold">{invoice.customer.firmName}</h3>
            <div className="space-y-3 text-[13px]">
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                <span className="text-on-surface">{invoice.customer.state}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span className="text-on-surface font-mono">
                  {invoice.customer.gstin || 'Unregistered'}
                </span>
              </div>
            </div>
          </DetailCard>

          <DetailCard title="Dispatch Reference">
            <div className="space-y-3 text-[13px]">
              <div>
                <span className="text-on-surface-variant mb-0.5 block">Challan No.</span>
                <Link
                  href={`/dispatch-entries/${invoice.dispatchEntry.id}`}
                  className="text-accent-cyan hover:text-on-surface font-mono transition-colors"
                >
                  #{invoice.dispatchEntry.challanNo}
                </Link>
              </div>
              <div>
                <span className="text-on-surface-variant mb-0.5 block">Place of Supply</span>
                <span className="text-on-surface">{invoice.place}</span>
              </div>
              <div>
                <span className="text-on-surface-variant mb-0.5 block">Transport</span>
                <span className="text-on-surface">{invoice.transport || 'Self Delivery'}</span>
              </div>
              <div>
                <span className="text-on-surface-variant mb-0.5 block">Invoice Date</span>
                <span className="text-on-surface">{formatDate(invoice.date)}</span>
              </div>
            </div>
          </DetailCard>
        </div>
      </div>

      <AllocatePaymentsModal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        onSuccess={fetchInvoice}
        customerId={invoice.customer.id}
        customerName={invoice.customer.firmName}
      />
    </div>
  );
}
