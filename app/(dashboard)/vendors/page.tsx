'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';

const PAGE_LIMIT = 20;

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
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

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
      url.searchParams.append('page', String(page));
      url.searchParams.append('limit', String(PAGE_LIMIT));
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setVendors(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchVendors();
  }, [search, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<Vendor, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (v) => v.name,
        header: 'Vendor & Contact',
        cell: ({ row }) => {
          const vendor = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="bg-surface-container-high font-display text-primary border-outline-variant flex h-9 w-9 items-center justify-center rounded-lg border-[0.5px] text-xs font-bold">
                {vendor.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{vendor.name}</span>
                <span className="text-on-surface-variant text-xs">
                  {vendor.contactPerson || 'N/A'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'contact',
        accessorFn: (v) => v.phone ?? '',
        enableSorting: false,
        header: 'Contact Info',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-on-surface-variant">{row.original.phone || 'N/A'}</span>
            <span className="text-on-surface-variant">{row.original.email || 'N/A'}</span>
          </div>
        ),
      },
      {
        id: 'rating',
        accessorFn: (v) => v.rating ?? 0,
        header: 'Rating',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono">
            {row.original.rating != null ? row.original.rating.toFixed(1) : '—'}
          </span>
        ),
      },
      {
        id: 'status',
        accessorFn: (v) => (v.isActive ? 1 : 0),
        header: 'Status & Terms',
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1.5">
            <span
              className={
                row.original.isActive
                  ? 'bg-status-success/12 text-status-success rounded-full px-2 py-0.5 text-[11px] font-medium uppercase'
                  : 'bg-status-neutral/12 text-status-neutral rounded-full px-2 py-0.5 text-[11px] font-medium uppercase'
              }
            >
              {row.original.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="text-on-surface-variant text-xs">
              Net {row.original.paymentTerms || '30'} Days
            </span>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(row.original);
              }}
              className="text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-md p-1.5 transition-colors"
              title="Edit"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.original.id, row.original.name);
              }}
              className="text-on-surface-variant hover:text-status-error hover:bg-surface-container-high rounded-md p-1.5 transition-colors"
              title="Delete"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ),
      },
    ],
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="flex min-h-full flex-col gap-6">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search vendors by name, GSTIN, or contact..."
        actions={
          <Button onClick={openCreateModal}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Vendor
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={vendors}
        getRowId={(v) => v.id}
        loading={loading}
        onRowClick={(v) => router.push(`/vendors/${v.id}`)}
        emptyState={
          <EmptyState
            icon={<span className="material-symbols-outlined text-[40px]">factory</span>}
            title="No vendors found"
            description="Add a vendor or adjust your search."
          />
        }
        footer={
          !loading && (
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={PAGE_LIMIT}
              onPageChange={setPage}
            />
          )
        }
      />

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
