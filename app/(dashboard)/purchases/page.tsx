'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Pagination from '@/components/ui/Pagination';

const PAGE_LIMIT = 10;

type Vendor = {
  id: string;
  name: string;
};

type Purchase = {
  id: string;
  purchaseNo: string;
  vendorId: string;
  vendor: { name: string };
  date: string;
  totalAmount: string | number;
  paidAmount: string | number;
  paymentStatus: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  isCancelled?: boolean;
};

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vendorFilter, setVendorFilter] = useState('All');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [stats, setStats] = useState({
    totalValue: 0,
    pendingPayments: 0,
    activeVendors: 0,
    procurementHealth: 100,
  });

  const fetchVendors = async () => {
    try {
      // Filter dropdown needs the full list, not a paginated page.
      const res = await fetch('/api/vendors?limit=1000');
      const data = await res.json();
      if (data.data) {
        setVendors(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch vendors', error);
    }
  };

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/purchases', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (statusFilter !== 'All')
        url.searchParams.append('paymentStatus', statusFilter.toUpperCase());
      if (vendorFilter !== 'All') url.searchParams.append('vendorId', vendorFilter);
      url.searchParams.append('page', String(page));
      url.searchParams.append('limit', String(PAGE_LIMIT));

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setPurchases(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
        setStats({
          totalValue: data.summary?.totalValue ?? 0,
          pendingPayments: data.summary?.pendingPayments ?? 0,
          activeVendors: data.summary?.activeVendors ?? 0,
          procurementHealth: data.summary?.procurementHealth ?? 100,
        });
      }
    } catch (error) {
      console.error('Failed to fetch purchases', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-compiler/react-compiler
    fetchVendors();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, statusFilter, vendorFilter]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchPurchases();
  }, [search, statusFilter, vendorFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-secondary/15 text-secondary';
      case 'PARTIAL':
        return 'bg-orange-400/15 text-orange-400';
      case 'UNPAID':
        return 'bg-error/15 text-error';
      default:
        return 'bg-surface-variant text-on-surface-variant';
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Header Area */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <h1 className="font-headline-md text-headline-md text-primary">Purchases</h1>
          <div className="bg-outline-variant mx-2 h-6 w-[1px]"></div>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined text-on-surface-variant absolute left-3 text-[20px]">
              search
            </span>
            <input
              className="bg-surface-container-lowest border-outline-variant text-body-md focus:border-secondary w-64 rounded-lg border-[0.5px] py-1.5 pr-4 pl-10 transition-colors focus:ring-0"
              placeholder="Search orders..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="mr-4 flex items-center gap-2">
            <button className="text-on-surface-variant hover:text-primary p-2 transition-transform active:scale-95">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-on-surface-variant hover:text-primary p-2 transition-transform active:scale-95">
              <span className="material-symbols-outlined">history</span>
            </button>
          </div>
          <Link
            href="/purchases/new"
            className="bg-primary text-on-primary font-body-md flex items-center gap-2 rounded-lg px-5 py-2 font-semibold transition-colors duration-200 hover:opacity-90 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Purchase
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container border-outline-variant mb-2 flex flex-wrap items-center justify-between gap-4 rounded-xl border-[0.5px] p-4">
        <div className="flex items-center gap-4">
          {/* Payment Status Tabs */}
          <div className="bg-surface-container-low border-outline-variant flex rounded-lg border-[0.5px] p-1">
            {['All', 'Paid', 'Partial', 'Unpaid'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-body-md rounded-md px-4 py-1.5 font-medium transition-colors ${statusFilter === status ? 'bg-surface-variant text-primary' : 'text-on-surface-variant hover:text-primary'}`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="bg-outline-variant mx-2 h-8 w-[1px]"></div>
          {/* Vendor Dropdown */}
          <div className="group relative">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="bg-surface-container-low border-outline-variant text-body-md text-on-surface-variant flex appearance-none items-center gap-2 rounded-lg border-[0.5px] px-4 py-2 pr-10 transition-colors outline-none hover:border-[#8e9192]"
            >
              <option value="All">Vendor: All</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-on-surface-variant pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[18px]">
              expand_more
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">{/* Placeholders hidden for MVP */}</div>
      </div>

      {/* Dashboard Stats Row */}
      <div className="mb-2 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-5">
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">
            Total Purchase Value
          </p>
          <h3 className="font-display text-display text-primary">
            ₹{stats.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
        </div>
        <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-5">
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">
            Pending Payments
          </p>
          <h3 className="font-display text-display text-error">
            ₹{stats.pendingPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
        </div>
        <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-5">
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">
            Active Vendors
          </p>
          <h3 className="font-display text-display text-primary">{stats.activeVendors}</h3>
        </div>
        <div className="bg-surface-container border-outline-variant relative overflow-hidden rounded-xl border-[0.5px] p-5">
          <div className="relative z-10">
            <p className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">
              Procurement Health
            </p>
            <h3 className="font-display text-display text-secondary">{stats.procurementHealth}%</h3>
            <p className="font-data-tabular text-data-tabular text-on-surface-variant mt-2">
              On-time fulfillment
            </p>
          </div>
        </div>
      </div>

      {/* Data Grid Table */}
      <div className="bg-surface-container border-outline-variant flex flex-1 flex-col overflow-hidden rounded-xl border-[0.5px]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-high border-outline-variant border-b-[0.5px]">
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  Purchase #
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  Vendor
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  Date
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 text-right tracking-wider uppercase">
                  Total Amount (₹)
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase">
                  Payment Status
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 tracking-wider uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-outline-variant/30 divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-on-surface-variant p-6 text-center">
                    Loading...
                  </td>
                </tr>
              ) : pagination.total === 0 ? (
                <tr>
                  <td colSpan={6} className="text-on-surface-variant p-6 text-center">
                    No purchases found.
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    onClick={() => router.push(`/purchases/${purchase.id}`)}
                    className="group cursor-pointer transition-colors hover:bg-[#252525]"
                  >
                    <td className="font-data-tabular text-data-tabular text-primary px-6 py-4">
                      {purchase.purchaseNo}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-surface-variant text-secondary flex h-8 w-8 items-center justify-center rounded text-[14px] font-bold">
                          {purchase.vendor.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-body-md text-on-surface font-medium">
                          {purchase.vendor.name}
                        </span>
                      </div>
                    </td>
                    <td className="text-body-md text-on-surface-variant px-6 py-4">
                      {new Date(purchase.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="font-data-tabular text-data-tabular text-primary px-6 py-4 text-right">
                      {Number(purchase.totalAmount).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getStatusColor(purchase.paymentStatus)}`}
                      >
                        {purchase.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="group/menu relative inline-block">
                        <button className="text-on-surface-variant hover:text-primary p-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                        <div className="absolute top-full right-0 z-10 hidden pt-2 group-hover/menu:block">
                          <div className="flex w-40 flex-col rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] p-1 shadow-xl">
                            <Link
                              href={`/purchases/${purchase.id}`}
                              className="text-on-surface-variant hover:bg-surface-container-high hover:text-primary flex items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                visibility
                              </span>
                              View
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={PAGE_LIMIT}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
