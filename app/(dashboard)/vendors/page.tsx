'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { FormField, SelectInput, SubmitError, TextInput } from '@/components/ui/form';

const PAGE_LIMIT = 20;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    setErrors({});
    setSubmitError(null);
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
    setErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!formData.name.trim()) next.name = 'Vendor name is required.';
    if (!formData.phone.trim()) next.phone = 'Phone is required.';
    if (!editingId && !formData.address.trim()) next.address = 'Address is required.';
    if (!editingId && !formData.state.trim()) next.state = 'State is required.';
    if (formData.email.trim() && !EMAIL_REGEX.test(formData.email.trim())) {
      next.email = 'Invalid email.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
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
        setSubmitError(error.error?.message ?? error.message ?? 'Failed to save vendor.');
      }
    } catch (error) {
      console.error(`Failed to ${editingId ? 'update' : 'create'} vendor`, error);
      setSubmitError(`Failed to ${editingId ? 'update' : 'create'} vendor.`);
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
          <div className="animate-in zoom-in-95 hide-scrollbar border-border bg-surface-container max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl duration-200">
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
              <SubmitError>{submitError}</SubmitError>
              <FormField label="Company / Vendor Name" required error={errors.name}>
                <TextInput
                  placeholder="e.g. Acme Supplies"
                  value={formData.name}
                  invalid={!!errors.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Phone" required error={errors.phone}>
                  <TextInput
                    placeholder="+91..."
                    value={formData.phone}
                    invalid={!!errors.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </FormField>
                <FormField label="Email" error={errors.email}>
                  <TextInput
                    type="email"
                    placeholder="contact@company.com"
                    value={formData.email}
                    invalid={!!errors.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </FormField>
              </div>
              <FormField label="Address" required={!editingId} error={errors.address}>
                <TextInput
                  placeholder="Full business address"
                  value={formData.address}
                  invalid={!!errors.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="State" required={!editingId} error={errors.state}>
                  <TextInput
                    placeholder="e.g. Maharashtra"
                    value={formData.state}
                    invalid={!!errors.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </FormField>
                <FormField label="GSTIN">
                  <TextInput
                    className="font-mono uppercase"
                    placeholder="15-digit GSTIN"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Payment Terms (Days)">
                  <TextInput
                    type="number"
                    placeholder="30"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  />
                </FormField>
                {editingId && (
                  <FormField label="Status">
                    <SelectInput
                      value={formData.isActive.toString()}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.value === 'true' })
                      }
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </SelectInput>
                  </FormField>
                )}
              </div>
              <div className="border-border mt-6 flex gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
