'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { RegistrationMark } from '@/components/ui/RegistrationMark';
import { DetailCard } from '@/components/ui/DetailCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

type StockTxn = {
  id: string;
  changeQty: string | number;
  stockBefore: string | number;
  stockAfter: string | number;
  reason: string;
  createdAt: string;
};

type VendorLink = {
  id: string;
  isPreferred: boolean;
  vendor: { id: string; name: string };
};

type Product = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  basePrice: string | number;
  currentStock: string | number;
  lowerStockLimit: string | number;
  isActive: boolean;
  category: { name: string } | null;
  vendorProducts: VendorLink[];
  stockTxns: StockTxn[];
};

function formatDateTime(val: string) {
  return new Date(val).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adjustQty, setAdjustQty] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      if (!res.ok || !data.data) {
        setError(data.error?.message || 'Failed to load product');
        return;
      }
      setProduct(data.data);
    } catch (err) {
      console.error('Failed to load product', err);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAdjust = async () => {
    const qty = Number(adjustQty);
    if (!Number.isFinite(qty) || qty === 0) {
      window.alert('Enter a non-zero adjustment quantity (use a negative value to reduce stock).');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`/api/products/${id}/stock/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty, reason: 'ADJUSTMENT' }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error?.message ?? 'Failed to adjust stock');
        return;
      }
      setAdjustQty('');
      fetchProduct();
    } catch (err) {
      console.error('Failed to adjust stock', err);
      window.alert('Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <RegistrationMark size="lg" spinning />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-status-error text-[48px]">error</span>
        <p className="text-on-surface font-semibold">{error || 'Product not found'}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/products')}>
          Back to Products
        </Button>
      </div>
    );
  }

  const currentStock = Number(product.currentStock);
  const lowerLimit = Number(product.lowerStockLimit);
  const isLow = currentStock < lowerLimit;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.push('/products')}>
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Button>
        <div>
          <h1 className="font-display text-on-surface text-xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <p className="text-on-surface-variant mt-0.5 font-mono text-sm uppercase">
            {product.sku} · {product.category?.name || 'Uncategorized'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Stock + adjust */}
        <DetailCard title="Stock">
          <div className="mb-4 flex items-baseline gap-2">
            <span
              className={`font-mono text-3xl font-bold ${isLow ? 'text-status-error' : 'text-on-surface'}`}
            >
              {currentStock}
            </span>
            <span className="text-on-surface-variant text-[13px]">{product.unit}</span>
            {isLow && (
              <span className="bg-status-error/10 text-status-error ml-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase">
                Low (min {lowerLimit})
              </span>
            )}
          </div>

          <label className="text-on-surface-variant mb-1.5 block text-[12px] font-medium">
            Manual Adjustment (+/-)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.001"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="e.g. -5 or 10"
              className="bg-surface-container-lowest border-border text-on-surface focus:border-ring w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
            />
            <Button size="sm" disabled={saving} onClick={handleAdjust}>
              {saving ? '…' : 'Apply'}
            </Button>
          </div>
          <p className="text-on-surface-variant mt-2 text-[11px]">
            Recorded as an ADJUSTMENT stock transaction; cannot drive stock negative.
          </p>
        </DetailCard>

        {/* Vendors */}
        <DetailCard title="Vendors">
          {product.vendorProducts.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No vendors linked.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {product.vendorProducts.map((vp) => (
                <li key={vp.id} className="flex items-center justify-between text-[13px]">
                  <button
                    onClick={() => router.push(`/vendors/${vp.vendor.id}`)}
                    className="text-on-surface hover:text-accent-cyan font-medium"
                  >
                    {vp.vendor.name}
                  </button>
                  {vp.isPreferred && (
                    <span className="bg-accent-cyan/15 text-accent-cyan rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">
                      Preferred
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DetailCard>

        {/* Meta */}
        <DetailCard title="Details">
          <dl className="flex flex-col gap-3 text-[13px]">
            {[
              ['Base Price', `₹ ${Number(product.basePrice).toFixed(2)}`],
              ['Unit', product.unit],
              ['Low-stock limit', String(lowerLimit)],
              ['Status', product.isActive ? 'Active' : 'Inactive'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">{label}</dt>
                <dd className="text-on-surface text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </DetailCard>
      </div>

      {/* Stock transactions */}
      <DetailCard title="Recent Stock Transactions" contentClassName="p-0">
        {product.stockTxns.length === 0 ? (
          <EmptyState
            icon={<span className="material-symbols-outlined text-[40px]">receipt_long</span>}
            title="No stock movements yet"
            description="Purchases, dispatches, and manual adjustments will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-container-high text-on-surface-variant border-border border-b text-[11px] font-medium tracking-widest uppercase">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3 text-right">Change</th>
                  <th className="px-5 py-3 text-right">After</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {product.stockTxns.map((txn) => {
                  const change = Number(txn.changeQty);
                  return (
                    <tr key={txn.id} className="hover:bg-surface-container transition-colors">
                      <td className="text-on-surface-variant px-5 py-3 text-[13px]">
                        {formatDateTime(txn.createdAt)}
                      </td>
                      <td className="text-on-surface px-5 py-3 text-[13px]">{txn.reason}</td>
                      <td
                        className={`px-5 py-3 text-right font-mono ${change < 0 ? 'text-status-error' : 'text-status-success'}`}
                      >
                        {change > 0 ? '+' : ''}
                        {change}
                      </td>
                      <td className="text-on-surface px-5 py-3 text-right font-mono">
                        {Number(txn.stockAfter)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  );
}
