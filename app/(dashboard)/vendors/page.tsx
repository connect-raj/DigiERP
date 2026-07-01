'use client';

import React, { useState, useEffect } from 'react';

type Vendor = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  rating: number;
  isActive: boolean;
  paymentTerms: number;
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/vendors', window.location.origin);
      if (search) url.searchParams.append('search', search);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setVendors(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch vendors', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full gap-8">
      {/* Header and Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
        <div className="md:col-span-5 flex flex-col gap-4">
          <div>
            <h1 className="font-display text-display text-primary">Vendors Directory</h1>
            <p className="font-body-md text-on-surface-variant mt-1">Manage supplier relationships and contact details.</p>
          </div>
          <div className="bg-[#1c1c1c] border-[0.5px] border-[#333] rounded-xl p-1 flex items-center h-[52px] focus-within:border-secondary transition-colors">
            <span className="material-symbols-outlined text-[#8e9192] px-3">search</span>
            <input 
              className="w-full bg-transparent border-none text-primary placeholder:text-[#8e9192] focus:ring-0 font-body-md text-[13px] p-0" 
              placeholder="Search vendors by name, GSTIN, or contact..." 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="md:col-span-7 flex justify-end gap-4 h-[52px]">
          <div className="bg-[#1c1c1c] border-[0.5px] border-[#333] rounded-xl px-4 flex items-center justify-between min-w-[160px] cursor-pointer hover:border-[#555] transition-colors">
            <span className="text-[#c4c7c8] font-body-md text-[13px]">Status: Active</span>
            <span className="material-symbols-outlined text-[#8e9192]">arrow_drop_down</span>
          </div>
          <button className="bg-primary text-background px-6 rounded-xl font-bold font-body-md flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-sm">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add Vendor
          </button>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-[#1c1c1c] border-[0.5px] border-[#333] rounded-xl overflow-hidden flex flex-col min-h-[500px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-[0.5px] border-[#333] bg-[#222]">
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline tracking-widest uppercase">Vendor & Contact</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline tracking-widest uppercase">Contact Info</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline tracking-widest uppercase text-center">Rating</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline tracking-widest uppercase">Status & Terms</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline tracking-widest uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-[0.5px] divide-[#333]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">Loading vendors...</td>
              </tr>
            ) : vendors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">No vendors found.</td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-[#252525] transition-colors group cursor-pointer">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-high border-[0.5px] border-[#444] flex items-center justify-center font-display font-bold text-primary">
                        {vendor.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-primary text-[14px]">{vendor.name}</span>
                        <span className="text-[12px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[14px]">person</span> {vendor.contactPerson || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px] text-[#8e9192]">call</span>
                        {vendor.phone || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px] text-[#8e9192]">mail</span>
                        {vendor.email || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="inline-flex items-center gap-1 bg-surface-container-highest px-2.5 py-1 rounded-full border-[0.5px] border-[#444]">
                      <span className="font-data-tabular font-bold text-primary text-[13px]">{vendor.rating.toFixed(1)}</span>
                      <span className="material-symbols-outlined text-[14px] text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col items-start gap-2">
                      {vendor.isActive ? (
                        <span className="bg-green-500/10 text-green-400 border-[0.5px] border-green-500/20 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">Active</span>
                      ) : (
                        <span className="bg-outline-variant/20 text-outline border-[0.5px] border-outline-variant/30 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">Inactive</span>
                      )}
                      <span className="text-[12px] text-on-surface-variant bg-[#222] px-2 py-0.5 rounded border-[0.5px] border-[#333]">Net {vendor.paymentTerms} Days</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-1.5 text-outline hover:text-primary transition-all opacity-0 group-hover:opacity-100 hover:bg-[#333] rounded-md">
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
