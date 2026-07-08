'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RecordPaymentModal from '../_components/RecordPaymentModal';

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

      const purchaseData = await purchaseRes.json();
      const paymentsData = await paymentsRes.json();

      if (purchaseRes.ok) setPurchase(purchaseData.data);
      if (paymentsRes.ok) setPayments(paymentsData.data);
    } catch (error) {
      console.error('Failed to fetch purchase details', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps
    fetchPurchaseData();
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

  if (loading) return <div className="text-on-surface-variant p-10">Loading...</div>;
  if (!purchase) return <div className="text-on-surface-variant p-10">Purchase not found.</div>;

  const totalAmt = Number(purchase.totalAmount);
  const paidAmt = Number(purchase.paidAmount);
  const pendingAmt = totalAmt - paidAmt;
  const subTotal = totalAmt - Number(purchase.totalGst);

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Detail Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="text-on-surface-variant font-body-sm flex items-center gap-2">
            <Link href="/purchases" className="hover:text-primary transition-colors">
              Purchases
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-medium">{purchase.purchaseNo}</span>
          </div>
          <div className="mt-1 flex items-center gap-4">
            <h1 className="font-headline-md text-headline-md text-primary">
              {purchase.purchaseNo}
            </h1>
            {purchase.isCancelled ? (
              <span className="bg-error/15 text-error rounded-full px-3 py-1 text-[12px] font-bold tracking-wider uppercase">
                Cancelled
              </span>
            ) : (
              <span
                className={`rounded-full px-3 py-1 text-[12px] font-bold tracking-wider uppercase ${
                  purchase.paymentStatus === 'PAID'
                    ? 'bg-secondary/15 text-secondary'
                    : purchase.paymentStatus === 'PARTIAL'
                      ? 'bg-orange-400/15 text-orange-400'
                      : 'bg-error/15 text-error'
                }`}
              >
                {purchase.paymentStatus}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="border-outline-variant text-on-surface hover:bg-surface-container-high font-body-md flex items-center gap-2 rounded-lg border-[0.5px] px-4 py-2 font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download PDF
          </button>
          {!purchase.isCancelled && !purchase.receivedDate && (
            <button
              onClick={handleReceive}
              className="bg-surface-variant text-on-surface-variant font-body-md hover:bg-surface-container-highest flex items-center gap-2 rounded-lg px-4 py-2 font-semibold shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Mark Received
            </button>
          )}
          {!purchase.isCancelled && pendingAmt > 0 && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="bg-primary text-on-primary font-body-md flex items-center gap-2 rounded-lg px-5 py-2 font-semibold shadow-sm transition-all hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">payments</span>
              Record Payment
            </button>
          )}
          {!purchase.isCancelled && (
            <div className="group relative ml-1">
              <button className="border-outline-variant text-on-surface hover:bg-surface-container-high flex h-10 w-10 items-center justify-center rounded-lg border-[0.5px] transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
              <div className="absolute top-full right-0 z-10 hidden pt-2 group-hover:block">
                <div className="flex w-48 flex-col rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] p-1 shadow-xl">
                  <a
                    href={`mailto:${purchase.vendor.email || ''}?subject=Purchase Order ${purchase.purchaseNo}&body=Dear ${purchase.vendor.name},%0D%0A%0D%0APlease find attached the details for PO ${purchase.purchaseNo}.`}
                    className="text-on-surface-variant hover:bg-surface-container-high hover:text-primary flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[14px] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">mail</span> Email Vendor
                  </a>
                  <div className="bg-outline-variant/50 my-1 h-[0.5px] w-full"></div>
                  <button
                    onClick={handleCancel}
                    className="hover:bg-error/10 text-error flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[14px] transition-colors"
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
          <div className="bg-surface-container border-outline-variant overflow-hidden rounded-2xl border-[0.5px]">
            <div className="border-outline-variant border-b-[0.5px] p-5">
              <h2 className="font-title-md text-title-md text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">inventory_2</span>
                Ordered Items
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
                      Unit Price
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
                  {purchase.items.map((item) => {
                    const lTotal = Number(item.lineTotal);
                    const lTax = Number(item.cgst) + Number(item.sgst) + Number(item.igst);
                    const lPrice = Number(item.unitPrice);
                    const lQty = Number(item.quantity);
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-[#222]">
                        <td className="px-5 py-4">
                          <p className="text-body-md text-primary font-medium">
                            {item.product.name}
                          </p>
                          <p className="text-on-surface-variant mt-0.5 text-[12px]">
                            HSN: {item.product.category.hsnCode || 'N/A'} | GST:{' '}
                            {item.product.category.gstRate}%
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-data-tabular text-body-md text-primary">
                            {lQty} {item.product.unit}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-data-tabular text-body-md text-primary">
                            ₹{lPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-data-tabular text-body-md text-primary">
                            ₹{lTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-data-tabular text-body-md text-primary font-semibold">
                            ₹{lTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History Timeline */}
          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">history</span>
              Payment History
            </h2>
            <div className="relative ml-3 space-y-8 border-l border-[#333] pb-4">
              {/* Payment Records */}
              {payments.map((payment) => (
                <div key={payment.id} className="relative pl-8">
                  <div className="bg-secondary absolute top-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-[#1c1c1c]"></div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-body-md text-primary font-medium">
                        Payment Recorded
                      </span>
                      <span className="font-data-tabular text-secondary text-[15px] font-bold">
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
                          <div className="h-3 w-[1px] bg-[#444]"></div>
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
                  <div className="bg-primary absolute top-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-[#1c1c1c]"></div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-body-md text-primary font-medium">Order Received</span>
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
                <div className="absolute top-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-[#1c1c1c] bg-[#555]"></div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-body-md text-primary font-medium">
                      Purchase Order Created
                    </span>
                    <span className="font-data-tabular text-primary text-[15px] font-bold">
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
          </div>
        </div>

        {/* Right Column - Financials & Vendor Details */}
        <div className="flex flex-col gap-6">
          {/* Financial Summary */}
          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-5">Financial Summary</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-on-surface-variant">Subtotal</span>
                <span className="text-primary font-data-tabular">
                  ₹{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-on-surface-variant">Total Tax (GST)</span>
                <span className="text-primary font-data-tabular">
                  ₹{Number(purchase.totalGst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-outline-variant my-1 h-[0.5px] w-full bg-[#333]"></div>
              <div className="flex items-center justify-between">
                <span className="font-body-md text-primary font-bold">Grand Total</span>
                <span className="font-data-tabular text-primary text-[18px] font-bold">
                  ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-surface-container-lowest mt-2 rounded-xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-on-surface-variant text-[13px]">Amount Paid</span>
                  <span className="font-data-tabular text-secondary font-semibold">
                    ₹{paidAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant text-[13px]">Pending Balance</span>
                  <span className="font-data-tabular font-semibold text-orange-400">
                    ₹{pendingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#222]">
                  <div
                    className="bg-secondary h-full rounded-full transition-all duration-1000"
                    style={{ width: `${totalAmt > 0 ? (paidAmt / totalAmt) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Details */}
          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-title-md text-title-md text-primary">Vendor Info</h2>
              <Link
                href={`/vendors`}
                className="text-secondary hover:text-primary text-[13px] font-medium transition-colors"
              >
                View Profile
              </Link>
            </div>

            <div className="mb-6 flex items-start gap-4">
              <div className="bg-surface-variant text-primary flex h-12 w-12 items-center justify-center rounded-xl text-[18px] font-bold">
                {purchase.vendor.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-body-md text-primary font-semibold">{purchase.vendor.name}</h3>
                <p className="text-on-surface-variant mt-0.5 text-[13px]">
                  {purchase.vendor.address}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-[13px]">
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">call</span>
                <span className="text-primary">{purchase.vendor.phone}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span className="text-primary">{purchase.vendor.email || 'N/A'}</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span className="text-primary">Inv: {purchase.vendorInvoiceNo}</span>
              </div>
            </div>
          </div>
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
