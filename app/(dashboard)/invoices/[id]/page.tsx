'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AllocatePaymentsModal from '../../payments/_components/AllocatePaymentsModal';

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
  paidAmount: string | number;
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

const paymentStatusColor = (status: string) => {
  switch (status) {
    case 'PAID':
      return 'bg-secondary/15 text-secondary';
    case 'PARTIAL':
      return 'bg-orange-400/15 text-orange-400';
    default:
      return 'bg-error/15 text-error';
  }
};

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
    fetchInvoice();
  }, [fetchInvoice]);

  if (loading) {
    return (
      <div className="text-on-surface-variant flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-secondary animate-spin text-[32px]">
            progress_activity
          </span>
          <span>Loading invoice...</span>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-[48px] text-red-400">error</span>
        <p className="text-body-lg text-primary font-bold">{error || 'Invoice not found'}</p>
        <button
          onClick={() => router.push('/invoices')}
          className="bg-surface-container border-outline-variant text-primary text-body-sm rounded-lg border-[0.5px] px-4 py-2 transition-colors hover:bg-[#252525]"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  const pendingAmt = Number(invoice.totalAmount) - Number(invoice.paidAmount);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="text-on-surface-variant font-body-sm flex items-center gap-2">
            <Link href="/invoices" className="hover:text-primary transition-colors">
              Invoices
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-medium">{invoice.invoiceNo}</span>
          </div>
          <div className="mt-1 flex items-center gap-4">
            <h1 className="font-headline-md text-headline-md text-primary">{invoice.invoiceNo}</h1>
            <span
              className={`rounded-full px-3 py-1 text-[12px] font-bold tracking-wider uppercase ${paymentStatusColor(invoice.paymentStatus)}`}
            >
              {invoice.paymentStatus}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-outline-variant text-on-surface hover:bg-surface-container-high font-body-md flex items-center gap-2 rounded-lg border-[0.5px] px-4 py-2 font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download PDF
          </a>
          {invoice.paymentStatus !== 'PAID' && (
            <button
              onClick={() => setIsAllocateModalOpen(true)}
              className="bg-primary text-on-primary font-body-md flex items-center gap-2 rounded-lg px-5 py-2 font-semibold shadow-sm transition-all hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">sync_alt</span>
              Allocate Payment
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Document Preview */}
          <div className="bg-surface-container border-outline-variant overflow-hidden rounded-2xl border-[0.5px]">
            <div className="border-outline-variant border-b-[0.5px] p-5">
              <h2 className="font-title-md text-title-md text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">description</span>
                Document Preview
              </h2>
            </div>
            <iframe
              src={`/api/invoices/${invoice.id}/pdf`}
              title={`Invoice ${invoice.invoiceNo}`}
              className="h-[600px] w-full bg-white"
            />
          </div>

          {/* Line Items Table */}
          <div className="bg-surface-container border-outline-variant overflow-hidden rounded-2xl border-[0.5px]">
            <div className="border-outline-variant border-b-[0.5px] p-5">
              <h2 className="font-title-md text-title-md text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">inventory_2</span>
                Line Items
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-outline-variant border-b-[0.5px]">
                    <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 tracking-wider uppercase">
                      Product
                    </th>
                    <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 text-right tracking-wider uppercase">
                      Quantity
                    </th>
                    <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 text-right tracking-wider uppercase">
                      Price
                    </th>
                    <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 text-right tracking-wider uppercase">
                      Tax
                    </th>
                    <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 text-right tracking-wider uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-outline-variant/30 divide-y">
                  {invoice.items.map((item) => {
                    const tax = Number(item.cgst) + Number(item.sgst) + Number(item.igst);
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-[#222]">
                        <td className="text-body-md text-primary px-5 py-4 font-medium">
                          {item.productName}
                        </td>
                        <td className="font-data-tabular text-primary px-5 py-4 text-right">
                          {Number(item.quantity)}
                        </td>
                        <td className="font-data-tabular text-primary px-5 py-4 text-right">
                          {formatINR(item.price)}
                        </td>
                        <td className="font-data-tabular text-primary px-5 py-4 text-right">
                          {tax > 0 ? formatINR(tax) : '—'}
                        </td>
                        <td className="font-data-tabular text-primary px-5 py-4 text-right font-semibold">
                          {formatINR(item.lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Allocations */}
          <div className="bg-surface-container border-outline-variant overflow-hidden rounded-2xl border-[0.5px]">
            <div className="border-outline-variant border-b-[0.5px] p-5">
              <h2 className="font-title-md text-title-md text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">sync_alt</span>
                Payment Allocations
              </h2>
            </div>
            {allocations.length === 0 ? (
              <p className="text-on-surface-variant text-body-sm p-6 text-center">
                No payments have been allocated to this invoice yet.
              </p>
            ) : (
              <div className="divide-outline-variant/30 divide-y">
                {allocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-[#222]"
                  >
                    <div>
                      <Link
                        href={`/payments/${allocation.payment.id}`}
                        className="text-body-md text-primary font-semibold hover:underline"
                      >
                        {allocation.payment.mode.replace('_', ' ')}
                        {allocation.payment.reference ? ` · ${allocation.payment.reference}` : ''}
                      </Link>
                      <p className="text-on-surface-variant text-[12px]">
                        {formatDate(allocation.createdAt)}
                      </p>
                    </div>
                    <span className="font-data-tabular text-secondary font-semibold">
                      {formatINR(allocation.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-5">Financial Summary</h2>
            <div className="space-y-4">
              {Number(invoice.totalCgst) > 0 && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-on-surface-variant">CGST</span>
                  <span className="text-primary font-data-tabular">
                    {formatINR(invoice.totalCgst)}
                  </span>
                </div>
              )}
              {Number(invoice.totalSgst) > 0 && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-on-surface-variant">SGST</span>
                  <span className="text-primary font-data-tabular">
                    {formatINR(invoice.totalSgst)}
                  </span>
                </div>
              )}
              {Number(invoice.totalIgst) > 0 && (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-on-surface-variant">IGST</span>
                  <span className="text-primary font-data-tabular">
                    {formatINR(invoice.totalIgst)}
                  </span>
                </div>
              )}
              <div className="border-outline-variant my-1 h-[0.5px] w-full bg-[#333]"></div>
              <div className="flex items-center justify-between">
                <span className="font-body-md text-primary font-bold">Grand Total</span>
                <span className="font-data-tabular text-primary text-[18px] font-bold">
                  {formatINR(invoice.totalAmount)}
                </span>
              </div>

              <div className="bg-surface-container-lowest mt-2 rounded-xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-on-surface-variant text-[13px]">Amount Paid</span>
                  <span className="font-data-tabular text-secondary font-semibold">
                    {formatINR(invoice.paidAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant text-[13px]">Pending Balance</span>
                  <span className="font-data-tabular font-semibold text-orange-400">
                    {formatINR(pendingAmt)}
                  </span>
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#222]">
                  <div
                    className="bg-secondary h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Number(invoice.totalAmount) > 0 ? (Number(invoice.paidAmount) / Number(invoice.totalAmount)) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-title-md text-title-md text-primary">Customer</h2>
              <Link
                href={`/customers/${invoice.customer.id}`}
                className="text-secondary hover:text-primary text-[13px] font-medium transition-colors"
              >
                View Profile
              </Link>
            </div>
            <h3 className="font-body-md text-primary mb-1 font-semibold">
              {invoice.customer.firmName}
            </h3>
            <div className="space-y-3 text-[13px]">
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                <span className="text-primary">{invoice.customer.state}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span className="text-primary font-mono">
                  {invoice.customer.gstin || 'Unregistered'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-5">Dispatch Reference</h2>
            <div className="space-y-3 text-[13px]">
              <div>
                <span className="text-on-surface-variant mb-0.5 block">Challan No.</span>
                <Link
                  href={`/dispatch-entries/${invoice.dispatchEntry.id}`}
                  className="text-secondary hover:text-primary font-mono transition-colors"
                >
                  #{invoice.dispatchEntry.challanNo}
                </Link>
              </div>
              <div>
                <span className="text-on-surface-variant mb-0.5 block">Place of Supply</span>
                <span className="text-primary">{invoice.place}</span>
              </div>
              <div>
                <span className="text-on-surface-variant mb-0.5 block">Transport</span>
                <span className="text-primary">{invoice.transport || 'Self Delivery'}</span>
              </div>
              <div>
                <span className="text-on-surface-variant mb-0.5 block">Invoice Date</span>
                <span className="text-primary">{formatDate(invoice.date)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AllocatePaymentsModal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        onSuccess={fetchInvoice}
        customerId={invoice.customer.id}
        customerName={invoice.customer.firmName}
        initialInvoiceId={invoice.id}
      />
    </div>
  );
}
