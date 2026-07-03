'use client';

import React, { useState, useEffect } from 'react';

type Vendor = {
  id: string;
  name: string;
  contactPerson?: string | null;
  email: string | null;
  phone: string | null;
  address?: string;
  state?: string;
  gstin: string | null;
  rating?: number;
  isActive: boolean;
  paymentTerms?: string | number | null;
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
    isActive: true,
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
      address: vendor.address || '',
      state: vendor.state || '',
      email: vendor.email || '',
      gstin: vendor.gstin || '',
      paymentTerms: vendor.paymentTerms ? vendor.paymentTerms.toString() : '30',
      isActive: vendor.isActive,
    });
    setEditingId(vendor.id);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      state: '',
      email: '',
      gstin: '',
      paymentTerms: '30',
      isActive: true,
    });
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
          isActive: formData.isActive,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          phone: '',
          address: '',
          state: '',
          email: '',
          gstin: '',
          paymentTerms: '30',
          isActive: true,
        });
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

  const handleDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the vendor "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchVendors();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to delete vendor', error);
      alert('Failed to delete vendor');
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchVendors();
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col gap-8">
      {/* Header and Controls */}
      <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-12">
        <div className="flex flex-col gap-4 md:col-span-5">
          <div>
            <h1 className="font-display text-display text-primary">Vendors Directory</h1>
            <p className="font-body-md text-on-surface-variant mt-1">
              Manage supplier relationships and contact details.
            </p>
          </div>
          <div className="focus-within:border-secondary flex h-[52px] items-center rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] p-1 transition-colors">
            <span className="material-symbols-outlined px-3 text-[#8e9192]">search</span>
            <input
              className="text-primary font-body-md w-full border-none bg-transparent p-0 text-[13px] placeholder:text-[#8e9192] focus:ring-0"
              placeholder="Search vendors by name, GSTIN, or contact..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex h-[52px] justify-end gap-4 md:col-span-7">
          <div className="flex min-w-[160px] cursor-pointer items-center justify-between rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] px-4 transition-colors hover:border-[#555]">
            <span className="font-body-md text-[13px] text-[#c4c7c8]">Status: Active</span>
            <span className="material-symbols-outlined text-[#8e9192]">arrow_drop_down</span>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-primary text-background font-body-md hover:bg-opacity-90 flex items-center gap-2 rounded-xl px-6 font-bold shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add Vendor
          </button>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="flex min-h-[500px] flex-col overflow-hidden rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-[0.5px] border-[#333] bg-[#222]">
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 tracking-widest uppercase">
                Vendor & Contact
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 tracking-widest uppercase">
                Contact Info
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 text-center tracking-widest uppercase">
                Rating
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 tracking-widest uppercase">
                Status & Terms
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 text-right tracking-widest uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-[0.5px] divide-[#333]">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-on-surface-variant px-6 py-8 text-center">
                  Loading vendors...
                </td>
              </tr>
            ) : vendors.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-on-surface-variant px-6 py-8 text-center">
                  No vendors found.
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  className="group cursor-pointer transition-colors hover:bg-[#252525]"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="bg-surface-container-high font-display text-primary flex h-10 w-10 items-center justify-center rounded-lg border-[0.5px] border-[#444] font-bold">
                        {vendor.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-primary text-[14px] font-semibold">
                          {vendor.name}
                        </span>
                        <span className="text-on-surface-variant mt-0.5 flex items-center gap-1 text-[12px]">
                          <span className="material-symbols-outlined text-[14px]">person</span>{' '}
                          {vendor.contactPerson || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1.5">
                      <div className="text-on-surface-variant flex items-center gap-2 text-[13px]">
                        <span className="material-symbols-outlined text-[16px] text-[#8e9192]">
                          call
                        </span>
                        {vendor.phone || 'N/A'}
                      </div>
                      <div className="text-on-surface-variant flex items-center gap-2 text-[13px]">
                        <span className="material-symbols-outlined text-[16px] text-[#8e9192]">
                          mail
                        </span>
                        {vendor.email || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="bg-surface-container-highest inline-flex items-center gap-1 rounded-full border-[0.5px] border-[#444] px-2.5 py-1">
                      <span className="font-data-tabular text-primary text-[13px] font-bold">
                        {vendor.rating !== undefined && vendor.rating !== null
                          ? vendor.rating.toFixed(1)
                          : 'N/A'}
                      </span>
                      <span
                        className="material-symbols-outlined text-[14px] text-amber-400"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col items-start gap-2">
                      {vendor.isActive ? (
                        <span className="rounded border-[0.5px] border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[11px] font-bold tracking-wider text-green-400 uppercase">
                          Active
                        </span>
                      ) : (
                        <span className="bg-outline-variant/20 text-outline border-outline-variant/30 rounded border-[0.5px] px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase">
                          Inactive
                        </span>
                      )}
                      <span className="text-on-surface-variant rounded border-[0.5px] border-[#333] bg-[#222] px-2 py-0.5 text-[12px]">
                        Net {vendor.paymentTerms || '30'} Days
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(vendor);
                        }}
                        className="text-outline hover:text-primary rounded-md p-1.5 transition-colors hover:bg-[#333]"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(vendor.id, vendor.name);
                        }}
                        className="text-outline hover:text-error rounded-md p-1.5 transition-colors hover:bg-[#333]"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Vendor Modal */}
      {isModalOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
          <div className="animate-in zoom-in-95 hide-scrollbar max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-[0.5px] border-[#333] bg-[#1c1c1c] p-6 shadow-2xl duration-200">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-primary">
                {editingId ? 'Edit Vendor' : 'Add New Vendor'}
              </h3>
              <button
                className="material-symbols-outlined text-outline hover:text-primary"
                onClick={() => setIsModalOpen(false)}
              >
                close
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                  Company / Vendor Name *
                </label>
                <input
                  className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                  placeholder="e.g. Acme Supplies"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    Phone *
                  </label>
                  <input
                    className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    placeholder="+91..."
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    Email
                  </label>
                  <input
                    className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    placeholder="contact@company.com"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                  Address *
                </label>
                <input
                  className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                  placeholder="Full business address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required={!editingId}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    State *
                  </label>
                  <input
                    className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    placeholder="e.g. Maharashtra"
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required={!editingId}
                  />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    GSTIN
                  </label>
                  <input
                    className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    placeholder="15-digit GSTIN"
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    Payment Terms (Days)
                  </label>
                  <input
                    className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    placeholder="30"
                    type="number"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  />
                </div>
                {editingId && (
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                      Status
                    </label>
                    <select
                      className="text-body-md text-primary focus:border-secondary-container w-full appearance-none rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                      value={formData.isActive.toString()}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.value === 'true' })
                      }
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-4 border-t-[0.5px] border-[#333] pt-4">
                <button
                  className="text-primary flex-1 rounded-lg border-[0.5px] border-[#444] py-2.5 font-semibold transition-all hover:bg-[#252525]"
                  onClick={() => setIsModalOpen(false)}
                  type="button"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="bg-primary text-background hover:bg-opacity-90 flex-1 rounded-lg py-2.5 font-semibold transition-all disabled:opacity-50"
                  type="submit"
                  disabled={isSubmitting}
                >
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
