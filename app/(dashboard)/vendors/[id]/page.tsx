'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RegistrationMark } from '@/components/ui/RegistrationMark';
import { DetailCard } from '@/components/ui/DetailCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

type VendorProduct = {
  id: string;
  productId: string;
  isPreferred: boolean;
  product: {
    id: string;
    name: string;
    unit: string;
    category: { name: string } | null;
  };
};

type Vendor = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  state: string | null;
  gstin: string | null;
  isActive: boolean;
  vendorProducts: VendorProduct[];
};

type ProductOption = { id: string; name: string; unit: string };

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [linkProductId, setLinkProductId] = useState('');
  const [linkPreferred, setLinkPreferred] = useState(false);
  const [saving, setSaving] = useState(false);
  const [purchaseCount, setPurchaseCount] = useState<number | null>(null);

  const fetchVendor = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/vendors/${id}`);
      const data = await res.json();
      if (!res.ok || !data.data) {
        setError(data.error?.message || 'Failed to load vendor');
        return;
      }
      setVendor(data.data);
    } catch (err) {
      console.error('Failed to load vendor', err);
      setError('Failed to load vendor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVendor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    fetch('/api/products?limit=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setProducts(
            data.data.map((p: { id: string; name: string; unit: string }) => ({
              id: p.id,
              name: p.name,
              unit: p.unit,
            }))
          );
        }
      })
      .catch((err) => console.error('Failed to fetch products', err));
  }, []);

  useEffect(() => {
    fetch(`/api/purchases?vendorId=${id}&limit=1`)
      .then((res) => res.json())
      .then((data) => setPurchaseCount(data.pagination?.total ?? 0))
      .catch((err) => console.error('Failed to fetch purchase count', err));
  }, [id]);

  const handleLink = async () => {
    if (!linkProductId) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/vendors/${id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{ productId: linkProductId, isPreferred: linkPreferred }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error?.message ?? 'Failed to link product');
        return;
      }
      setLinkProductId('');
      setLinkPreferred(false);
      fetchVendor();
    } catch (err) {
      console.error('Failed to link product', err);
      window.alert('Failed to link product');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (productId: string) => {
    if (!window.confirm('Unlink this product from the vendor?')) return;
    try {
      const res = await fetch(`/api/vendors/${id}/products/${productId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error?.message ?? 'Failed to unlink product');
        return;
      }
      fetchVendor();
    } catch (err) {
      console.error('Failed to unlink product', err);
      window.alert('Failed to unlink product');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <RegistrationMark size="lg" spinning />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-4 p-12">
        <span className="material-symbols-outlined text-status-error text-[48px]">error</span>
        <p className="text-on-surface font-semibold">{error || 'Vendor not found'}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/vendors')}>
          Back to Vendors
        </Button>
      </div>
    );
  }

  const linkedProductIds = new Set(vendor.vendorProducts.map((vp) => vp.productId));
  const availableProducts = products.filter((p) => !linkedProductIds.has(p.id));

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.push('/vendors')}>
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Button>
        <div>
          <h1 className="font-display text-on-surface text-xl font-semibold tracking-tight">
            {vendor.name}
          </h1>
          <p className="text-on-surface-variant mt-0.5 text-sm">
            {[vendor.contactPerson, vendor.state].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      </div>

      {/* Smart-buttons: live stats linking to filtered lists */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/purchases?vendorId=${id}`}
          className="border-border bg-surface-container-low hover:bg-surface-container flex min-w-[140px] flex-col rounded-xl border px-4 py-3 transition-colors"
        >
          <span className="text-on-surface-variant text-[11px] font-medium tracking-widest uppercase">
            Purchases
          </span>
          <span className="text-on-surface font-mono text-lg font-semibold">
            {purchaseCount ?? '—'}
          </span>
        </Link>
        <div className="border-border bg-surface-container-low flex min-w-[140px] flex-col rounded-xl border px-4 py-3">
          <span className="text-on-surface-variant text-[11px] font-medium tracking-widest uppercase">
            Supplied Products
          </span>
          <span className="text-on-surface font-mono text-lg font-semibold">
            {vendor.vendorProducts.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Vendor info */}
        <DetailCard title="Vendor Details">
          <dl className="flex flex-col gap-3 text-[13px]">
            {[
              ['Email', vendor.email],
              ['Phone', vendor.phone],
              ['GSTIN', vendor.gstin],
              ['Address', vendor.address],
              ['State', vendor.state],
              ['Status', vendor.isActive ? 'Active' : 'Inactive'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">{label}</dt>
                <dd className="text-on-surface text-right font-medium">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </DetailCard>

        {/* Linked products */}
        <DetailCard title="Supplied Products" contentClassName="p-0" className="lg:col-span-2">
          <div className="border-border bg-surface-container-low flex flex-wrap items-center gap-3 border-b p-4">
            <select
              value={linkProductId}
              onChange={(e) => setLinkProductId(e.target.value)}
              className="bg-surface-container-lowest border-border text-on-surface focus:border-ring rounded-lg border px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Add a product…</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <label className="text-on-surface-variant flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={linkPreferred}
                onChange={(e) => setLinkPreferred(e.target.checked)}
              />
              Preferred
            </label>
            <Button size="sm" disabled={!linkProductId || saving} onClick={handleLink}>
              {saving ? 'Linking…' : 'Link'}
            </Button>
          </div>

          {vendor.vendorProducts.length === 0 ? (
            <EmptyState
              icon={<span className="material-symbols-outlined text-[40px]">inventory_2</span>}
              title="No products linked yet"
              description="Link products this vendor supplies to speed up purchase entry."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-container-high text-on-surface-variant border-border border-b text-[11px] font-medium tracking-widest uppercase">
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Preferred</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {vendor.vendorProducts.map((vp) => (
                    <tr key={vp.id} className="hover:bg-surface-container transition-colors">
                      <td className="text-on-surface px-5 py-3 font-medium">{vp.product.name}</td>
                      <td className="text-on-surface-variant px-5 py-3 text-[13px]">
                        {vp.product.category?.name || '—'}
                      </td>
                      <td className="px-5 py-3">
                        {vp.isPreferred ? (
                          <span className="bg-accent-cyan/15 text-accent-cyan rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase">
                            Preferred
                          </span>
                        ) : (
                          <span className="text-on-surface-variant text-[12px]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleUnlink(vp.productId)}
                          className="text-on-surface-variant hover:text-status-error rounded p-1"
                          title="Unlink"
                        >
                          <span className="material-symbols-outlined text-[18px]">link_off</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      </div>
    </div>
  );
}
