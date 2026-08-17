'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import RecordPaymentModal from '../_components/RecordPaymentModal';
import { RegistrationMark } from '@/components/ui/RegistrationMark';
import { DetailCard } from '@/components/ui/DetailCard';
import { StatusPill, type Status } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/button';

type Purchase = {
  id: string;
  purchaseNo: string;
  vendorId: string;
  vendorInvoiceNo: string;
  date: string;
  totalAmount: string | number;
  totalGst: string | number;
  paidAmount: string | number;
  paymentStatus: string;
  isCancelled: boolean;
  createdAt: string;
  receivedDate: string | null;
  expectedDeliveryDate: string | null;
  vendor: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  items: {
    id: string;
    productId: string;
    quantity: string | number;
    unitPrice: string | number;
    cgst: string | number;
    sgst: string | number;
    igst: string | number;
    lineTotal: string | number;
    product: {
      name: string;
      unit: string;
      category: {
        gstRate: string | number;
        hsnCode?: string;
      };
    };
  }[];
};

type Payment = {
  id: string;
  amount: string | number;
  mode: string;
  reference: string | null;
  date: string;
  createdAt: string;
};

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const purchaseId = unwrappedParams.id;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchPurchaseData = async () => {
    try {
      setLoading(true);
      const [purchaseRes, paymentsRes] = await Promise.all([
        fetch(`/api/purchases/${purchaseId}`),
        fetch(`/api/purchases/${purchaseId}/payments`),
      ]);

      // Guard against non-JSON error responses (e.g. an HTML 4xx/5xx page):
      // parse only when the request succeeded so a failure can't crash the page.
      if (purchaseRes.ok) {
        const purchaseData = await purchaseRes.json();
        setPurchase(purchaseData.data);
      }
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.data ?? []);
      } else {
        console.error('Failed to fetch purchase payments', paymentsRes.status);
      }
    } catch (error) {
      console.error('Failed to fetch purchase details', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPurchaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseId]);

  const handleReceive = async () => {
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/receive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivedDate: new Date().toISOString() }),
      });
      if (res.ok) {
        fetchPurchaseData();
      } else {
        const err = await res.json();
        alert(`Failed to mark received: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error marking as received');
    }
  };

  const handleCancel = async () => {
    if (
      !confirm(
        'Are you sure you want to cancel this purchase? This will reverse stock and cannot be undone.'
      )
    )
      return;
    try {
      const res = await fetch(`/api/purchases/${purchaseId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPurchaseData();
      } else {
        const err = await res.json();
        alert(`Failed to cancel: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error cancelling purchase');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <RegistrationMark size="lg" spinning />
      </div>
    );
  }
  if (!purchase) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-status-error text-[48px]">error</span>
        <p className="text-on-surface font-semibold">Purchase not found</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/purchases">Back to Purchases</Link>
        </Button>
      </div>
    );
  }

  const totalAmt = Number(purchase.totalAmount);
  const paidAmt = Number(purchase.paidAmount);
  const pendingAmt = totalAmt - paidAmt;
  const subTotal = totalAmt - Number(purchase.totalGst);

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Detail Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href="/purchases">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-on-surface text-xl font-semibold tracking-tight">
              {purchase.purchaseNo}
            </h1>
            <StatusPill
              status={
                purchase.isCancelled ? 'CANCELLED' : (purchase.paymentStatus as Status)
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download PDF
          </Button>
          {!purchase.isCancelled && !purchase.receivedDate && (
            <Button variant="secondary" size="sm" onClick={handleReceive}>
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Mark Received
            </Button>
          )}
          {!purchase.isCancelled && pendingAmt > 0 && (
            <Button size="sm" onClick={() => setIsPaymentModalOpen(true)}>
              <span className="material-symbols-outlined text-[18px]">payments</span>
              Record Payment
            </Button>
          )}
          {!purchase.isCancelled && (
            <div className="group relative ml-1">
              <Button variant="outline" size="icon">
                <span className="material-symbols-outlined">more_vert</span>
              </Button>
              <div className="absolute top-full right-0 z-10 hidden pt-2 group-hover:block">
                <div className="border-border bg-surface-container flex w-48 flex-col rounded-xl border p-1 shadow-xl">
                  <a
                    href={`mailto:${purchase.vendor.email || ''}?subject=Purchase Order ${purchase.purchaseNo}&body=Dear ${purchase.vendor.name},%0D%0A%0D%0APlease find attached the details for PO ${purchase.purchaseNo}.`}
                    className="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[14px] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">mail</span> Email Vendor
                  </a>
                  <div className="bg-border my-1 h-px w-full"></div>
                  <button
                    onClick={handleCancel}
                    className="hover:bg-status-error/10 text-status-error flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[14px] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span> Cancel
                    Purchase
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Main Details */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Order Items Table */}
          <DetailCard title="Ordered Items" contentClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-container-high text-on-surface-variant border-border border-b text-[11px] font-medium tracking-widest uppercase">
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3 text-right">Quantity</th>
                    <th className="px-5 py-3 text-right">Unit Price</th>
                    <th className="px-5 py-3 text-right">Tax</th>
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {purchase.items.map((item) => {
                    const lTotal = Number(item.lineTotal);
                    const lTax = Number(item.cgst) + Number(item.sgst) + Number(item.igst);
                    const lPrice = Number(item.unitPrice);
                    const lQty = Number(item.quantity);
                    return (
                      <tr key={item.id} className="hover:bg-surface-container transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-on-surface font-medium">{item.product.name}</p>
                          <p className="text-on-surface-variant mt-0.5 text-[12px]">
                            HSN: {item.product.category.hsnCode || 'N/A'} | GST:{' '}
                            {item.product.category.gstRate}%
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-on-surface font-mono">
                            {lQty} {item.product.unit}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-on-surface font-mono">
                            ₹{lPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-on-surface font-mono">
                            ₹{lTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-on-surface font-mono font-semibold">
                            ₹{lTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DetailCard>

          {/* Payment History Timeline */}
          <DetailCard title="Payment History">
            <div className="border-border relative ml-3 space-y-8 border-l pb-4">
              {/* Payment Records */}
              {payments.map((payment) => (
                <div key={payment.id} className="relative pl-8">
                  <div className="bg-accent-cyan absolute top-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-surface-container-low"></div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface font-medium">
                        Payment Recorded
                      </span>
                      <span className="font-mono text-accent-cyan text-[15px] font-bold">
                        + ₹
                        {Number(payment.amount).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-[13px]">
                      {new Date(payment.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <div className="bg-surface-container-low border-outline-variant mt-2 inline-flex w-fit items-center gap-3 rounded-lg border-[0.5px] px-3 py-2 text-[12px]">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          account_balance
                        </span>
                        {payment.mode.replace('_', ' ')}
                      </span>
                      {payment.reference && (
                        <>
                          <div className="h-3 w-px bg-border"></div>
                          <span className="font-data-tabular text-on-surface-variant">
                            Ref: {payment.reference}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Order Received Event */}
              {purchase.receivedDate && (
                <div className="relative pl-8">
                  <div className="bg-on-surface absolute top-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-surface-container-low"></div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface font-medium">Order Received</span>
                    </div>
                    <p className="text-on-surface-variant text-[13px]">
                      {new Date(purchase.receivedDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Order Created Event */}
              <div className="relative pl-8">
                <div className="absolute top-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-surface-container-low bg-outline"></div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface font-medium">
                      Purchase Order Created
                    </span>
                    <span className="font-mono text-on-surface text-[15px] font-bold">
                      ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-[13px]">
                    {new Date(purchase.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  {purchase.expectedDeliveryDate && (
                    <div className="bg-surface-container-low border-outline-variant mt-2 inline-flex w-fit items-center gap-3 rounded-lg border-[0.5px] px-3 py-2 text-[12px]">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          local_shipping
                        </span>
                        Expected:{' '}
                        {new Date(purchase.expectedDeliveryDate).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DetailCard>
        </div>

        {/* Right Column - Financials & Vendor Details */}
        <div className="flex flex-col gap-6">
          {/* Financial Summary */}
          <DetailCard title="Financial Summary">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-on-surface-variant">Subtotal</span>
                <span className="text-on-surface font-mono">
                  ₹{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-on-surface-variant">Total Tax (GST)</span>
                <span className="text-on-surface font-mono">
                  ₹{Number(purchase.totalGst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-border my-1 h-px w-full"></div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface font-bold">Grand Total</span>
                <span className="text-on-surface font-mono text-[18px] font-bold">
                  ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-surface-container-lowest mt-2 rounded-xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-on-surface-variant text-[13px]">Amount Paid</span>
                  <span className="text-status-success font-mono font-semibold">
                    ₹{paidAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant text-[13px]">Pending Balance</span>
                  <span className="text-status-warning font-mono font-semibold">
                    ₹{pendingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="bg-surface-container-highest mt-4 h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-status-success h-full rounded-full transition-all duration-1000"
                    style={{ width: `${totalAmt > 0 ? (paidAmt / totalAmt) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </DetailCard>

          {/* Vendor Details */}
          <DetailCard
            title="Vendor Info"
            headerAside={
              <Link
                href={`/vendors/${purchase.vendor.id}`}
                className="text-accent-cyan hover:text-on-surface text-[13px] font-medium transition-colors"
              >
                View Profile
              </Link>
            }
          >
            <div className="mb-6 flex items-start gap-4">
              <div className="bg-surface-container-highest text-on-surface flex h-12 w-12 items-center justify-center rounded-xl text-[18px] font-bold">
                {purchase.vendor.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-on-surface font-semibold">{purchase.vendor.name}</h3>
                <p className="text-on-surface-variant mt-0.5 text-[13px]">
                  {purchase.vendor.address}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-[13px]">
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">call</span>
                <span className="text-on-surface">{purchase.vendor.phone}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span className="text-on-surface">{purchase.vendor.email || 'N/A'}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span className="text-on-surface">Inv: {purchase.vendorInvoiceNo}</span>
              </div>
            </div>
          </DetailCard>
        </div>
      </div>

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={fetchPurchaseData}
        purchaseId={purchase.id}
        purchaseNo={purchase.purchaseNo}
        pendingBalance={pendingAmt}
      />
    </div>
  );
}
