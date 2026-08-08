'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { RegistrationMark } from '@/components/ui/RegistrationMark';

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
        <span className="material-symbols-outlined text-[48px] text-red-400">error</span>
        <p className="text-body-lg text-primary font-bold">{error || 'Product not found'}</p>
        <button
          onClick={() => router.push('/products')}
          className="bg-surface-container border-outline-variant text-primary rounded-lg border-[0.5px] px-4 py-2 hover:bg-[#252525]"
        >
          Back to Products
        </button>
      </div>
    );
  }

  const currentStock = Number(product.currentStock);
  const lowerLimit = Number(product.lowerStockLimit);
  const isLow = currentStock < lowerLimit;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/products')}
          className="bg-surface-container border-outline-variant flex h-9 w-9 items-center justify-center rounded-lg border-[0.5px] hover:bg-[#252525]"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary">{product.name}</h1>
          <p className="text-on-surface-variant font-data-tabular text-body-sm mt-0.5 uppercase">
            {product.sku} · {product.category?.name || 'Uncategorized'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Stock + adjust */}
        <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-5">
          <h2 className="font-title-md text-title-md text-primary mb-4">Stock</h2>
          <div className="mb-4 flex items-baseline gap-2">
            <span
              className={`font-data-tabular text-3xl font-bold ${isLow ? 'text-error' : 'text-primary'}`}
            >
              {currentStock}
            </span>
            <span className="text-on-surface-variant text-[13px]">{product.unit}</span>
            {isLow && (
              <span className="bg-error/10 text-error ml-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase">
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
              className="bg-surface-container-lowest border-outline-variant text-body-sm w-full rounded-lg border-[0.5px] px-3 py-2"
            />
            <button
              disabled={saving}
              onClick={handleAdjust}
              className="bg-secondary text-on-secondary rounded-lg px-4 py-2 text-[13px] font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {saving ? '…' : 'Apply'}
            </button>
          </div>
          <p className="text-on-surface-variant mt-2 text-[11px]">
            Recorded as an ADJUSTMENT stock transaction; cannot drive stock negative.
          </p>
        </div>

        {/* Vendors */}
        <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-5">
          <h2 className="font-title-md text-title-md text-primary mb-4">Vendors</h2>
          {product.vendorProducts.length === 0 ? (
            <p className="text-on-surface-variant text-body-sm">No vendors linked.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {product.vendorProducts.map((vp) => (
                <li key={vp.id} className="flex items-center justify-between text-[13px]">
                  <button
                    onClick={() => router.push(`/vendors/${vp.vendor.id}`)}
                    className="text-primary hover:text-secondary font-medium"
                  >
                    {vp.vendor.name}
                  </button>
                  {vp.isPreferred && (
                    <span className="bg-secondary/15 text-secondary rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">
                      Preferred
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Meta */}
        <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-5">
          <h2 className="font-title-md text-title-md text-primary mb-4">Details</h2>
          <dl className="flex flex-col gap-3 text-[13px]">
            {[
              ['Base Price', `₹ ${Number(product.basePrice).toFixed(2)}`],
              ['Unit', product.unit],
              ['Low-stock limit', String(lowerLimit)],
              ['Status', product.isActive ? 'Active' : 'Inactive'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">{label}</dt>
                <dd className="text-primary text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Stock transactions */}
      <div className="bg-surface-container border-outline-variant overflow-hidden rounded-2xl border-[0.5px]">
        <div className="border-outline-variant border-b-[0.5px] p-5">
          <h2 className="font-title-md text-title-md text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">receipt_long</span>
            Recent Stock Transactions
          </h2>
        </div>
        {product.stockTxns.length === 0 ? (
          <p className="text-on-surface-variant text-body-sm p-6 text-center">
            No stock movements recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-outline-variant border-b-[0.5px]">
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 uppercase">
                    When
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 uppercase">
                    Reason
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 text-right uppercase">
                    Change
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant px-5 py-3 text-right uppercase">
                    After
                  </th>
                </tr>
              </thead>
              <tbody className="divide-outline-variant/30 divide-y">
                {product.stockTxns.map((txn) => {
                  const change = Number(txn.changeQty);
                  return (
                    <tr key={txn.id} className="transition-colors hover:bg-[#222]">
                      <td className="text-on-surface-variant px-5 py-3 text-[13px]">
                        {formatDateTime(txn.createdAt)}
                      </td>
                      <td className="text-primary px-5 py-3 text-[13px]">{txn.reason}</td>
                      <td
                        className={`font-data-tabular px-5 py-3 text-right ${change < 0 ? 'text-error' : 'text-green-400'}`}
                      >
                        {change > 0 ? '+' : ''}
                        {change}
                      </td>
                      <td className="font-data-tabular text-primary px-5 py-3 text-right">
                        {Number(txn.stockAfter)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
