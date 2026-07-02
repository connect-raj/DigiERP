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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    state: '',
    email: '',
    gstin: '',
    paymentTerms: '30',
  });

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

  const openEditModal = (vendor: Vendor) => {
    setFormData({
      name: vendor.name,
      phone: vendor.phone || '',
      address: '', // We don't have address in the Vendor list type right now, might need to fetch it or leave it blank if not returned
      state: '',
      email: vendor.email || '',
      gstin: vendor.gstin || '',
      paymentTerms: vendor.paymentTerms.toString(),
    });
    setEditingId(vendor.id);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData({ name: '', phone: '', address: '', state: '', email: '', gstin: '', paymentTerms: '30' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const url = editingId ? `/api/vendors/${editingId}` : '/api/vendors';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address || undefined,
          state: formData.state || undefined,
          email: formData.email || undefined,
          gstin: formData.gstin || undefined,
          paymentTerms: formData.paymentTerms,
        }),
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: '', phone: '', address: '', state: '', email: '', gstin: '', paymentTerms: '30' });
        setEditingId(null);
        fetchVendors();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error(`Failed to ${editingId ? 'update' : 'create'} vendor`, error);
      alert(`Failed to ${editingId ? 'update' : 'create'} vendor`);
    } finally {
      setIsSubmitting(false);
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
          <button 
            onClick={openCreateModal}
            className="bg-primary text-background px-6 rounded-xl font-bold font-body-md flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-sm"
          >
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
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(vendor);
                      }}
                      className="p-1.5 text-outline hover:text-primary transition-all opacity-0 group-hover:opacity-100 hover:bg-[#333] rounded-md"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#1c1c1c] border-[0.5px] border-[#333] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto hide-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline-md text-headline-md text-primary">
                {editingId ? 'Edit Vendor' : 'Add New Vendor'}
              </h3>
              <button className="material-symbols-outlined text-outline hover:text-primary" onClick={() => setIsModalOpen(false)}>close</button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Company / Vendor Name *</label>
                <input 
                  className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none" 
                  placeholder="e.g. Acme Supplies" 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Phone *</label>
                  <input 
                    className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none" 
                    placeholder="+91..." 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Email</label>
                  <input 
                    className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none" 
                    placeholder="contact@company.com" 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Address *</label>
                <input 
                  className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none" 
                  placeholder="Full business address" 
                  type="text" 
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required={!editingId}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">State *</label>
                  <input 
                    className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none" 
                    placeholder="e.g. Maharashtra" 
                    type="text" 
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required={!editingId}
                  />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">GSTIN</label>
                  <input 
                    className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none" 
                    placeholder="15-digit GSTIN" 
                    type="text" 
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Payment Terms (Days)</label>
                <input 
                  className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none" 
                  placeholder="30" 
                  type="number" 
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                />
              </div>
              <div className="flex gap-4 pt-4 mt-6 border-t-[0.5px] border-[#333]">
                <button className="flex-1 border-[0.5px] border-[#444] text-primary rounded-lg py-2.5 font-semibold hover:bg-[#252525] transition-all" onClick={() => setIsModalOpen(false)} type="button" disabled={isSubmitting}>Cancel</button>
                <button className="flex-1 bg-primary text-background rounded-lg py-2.5 font-semibold hover:bg-opacity-90 transition-all disabled:opacity-50" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
