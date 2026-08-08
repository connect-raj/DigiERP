'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar, FilterSelect } from '@/components/ui/ListToolbar';
import { FormField, SelectInput, SubmitError, TextInput } from '@/components/ui/form';

const PAGE_LIMIT = 20;

type Product = {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  category?: { name: string };
  basePrice: number;
  unit: string;
  currentStock: number;
  lowerStockLimit: number;
  isActive: boolean;
};

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    basePrice: '',
    unit: 'LTR',
    lowerStockLimit: '10',
    isActive: true,
  });

  const fetchCategories = async () => {
    try {
      // Category dropdown needs the full list, not a paginated page.
      const res = await fetch('/api/categories?limit=1000');
      const data = await res.json();
      if (data.data) setCategories(data.data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/products', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (categoryId) url.searchParams.append('categoryId', categoryId);
      url.searchParams.append('page', String(page));
      url.searchParams.append('limit', String(PAGE_LIMIT));

      const res = await fetch(url.toString());
      const data = await res.json();

      if (data.data) {
        setProducts(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
      }
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (product: Product) => {
    setFormData({
      name: product.name,
      categoryId: product.categoryId || '',
      basePrice: product.basePrice.toString(),
      unit: product.unit,
      lowerStockLimit: product.lowerStockLimit.toString(),
      isActive: product.isActive,
    });
    setEditingId(product.id);
    setErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      categoryId: '',
      basePrice: '',
      unit: 'LTR',
      lowerStockLimit: '10',
      isActive: true,
    });
    setEditingId(null);
    setErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!formData.name.trim()) next.name = 'Product name is required.';
    if (!formData.categoryId) next.categoryId = 'Category is required.';
    if (!formData.basePrice.trim() || Number(formData.basePrice) < 0) {
      next.basePrice = 'Enter a valid base price.';
    }
    if (!formData.lowerStockLimit.trim() || Number(formData.lowerStockLimit) < 0) {
      next.lowerStockLimit = 'Enter a valid stock level.';
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
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          categoryId: formData.categoryId,
          basePrice: Number(formData.basePrice),
          unit: formData.unit,
          lowerStockLimit: Number(formData.lowerStockLimit),
          ...(editingId ? { isActive: formData.isActive } : {}),
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          categoryId: '',
          basePrice: '',
          unit: 'LTR',
          lowerStockLimit: '10',
          isActive: true,
        });
        setEditingId(null);
        fetchProducts();
      } else {
        const error = await res.json();
        setSubmitError(error.error?.message ?? error.message ?? 'Failed to save product.');
      }
    } catch (error) {
      console.error(`Failed to ${editingId ? 'update' : 'create'} product`, error);
      setSubmitError(`Failed to ${editingId ? 'update' : 'create'} product.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the product "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchProducts();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to delete product', error);
      alert('Failed to delete product');
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, categoryId]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchProducts();
  }, [search, categoryId, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (p) => p.name,
        header: 'Name & SKU',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-on-surface-variant font-mono text-[11px] tracking-wider uppercase">
              {row.original.sku}
            </span>
          </div>
        ),
      },
      {
        id: 'category',
        accessorFn: (p) => p.category?.name ?? '',
        header: 'Category',
        cell: ({ row }) => (
          <span className="text-on-surface-variant">
            {row.original.category?.name || 'Uncategorized'}
          </span>
        ),
      },
      {
        id: 'price',
        accessorFn: (p) => Number(p.basePrice),
        header: 'Price',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-mono">
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              minimumFractionDigits: 2,
            }).format(Number(row.original.basePrice))}
          </span>
        ),
      },
      {
        id: 'stock',
        accessorFn: (p) => p.currentStock,
        header: 'Stock',
        cell: ({ row }) => {
          const low = row.original.currentStock < row.original.lowerStockLimit;
          return (
            <div className="flex items-center gap-2">
              <span className={low ? 'text-status-error font-mono font-bold' : 'font-mono'}>
                {row.original.currentStock} {row.original.unit}
              </span>
              {low && (
                <span className="bg-status-error/12 text-status-error rounded px-2 py-0.5 text-[10px] font-bold uppercase">
                  Low
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'status',
        accessorFn: (p) => (p.isActive ? 1 : 0),
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={
              row.original.isActive
                ? 'bg-status-success/12 text-status-success rounded-full px-2 py-0.5 text-[11px] font-medium uppercase'
                : 'bg-status-neutral/12 text-status-neutral rounded-full px-2 py-0.5 text-[11px] font-medium uppercase'
            }
          >
            {row.original.isActive ? 'Active' : 'Inactive'}
          </span>
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
        searchPlaceholder="Search products by name or category..."
        filters={
          <FilterSelect value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
        }
        actions={
          <Button onClick={openCreateModal}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Product
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={products}
        getRowId={(p) => p.id}
        loading={loading}
        onRowClick={(p) => router.push(`/products/${p.id}`)}
        emptyState={
          <EmptyState
            icon={<span className="material-symbols-outlined text-[40px]">inventory_2</span>}
            title="No products found"
            description="Add a product or adjust your filters."
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

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
          <div className="animate-in zoom-in-95 border-border bg-surface-container w-full max-w-md rounded-2xl border p-6 shadow-2xl duration-200">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-primary">
                {editingId ? 'Edit Product' : 'Add New Product'}
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
              <FormField label="Product Name" required error={errors.name}>
                <TextInput
                  placeholder="e.g. Cyan Ink 1Ltr"
                  value={formData.name}
                  invalid={!!errors.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormField>
              <FormField label="Category" required error={errors.categoryId}>
                <SelectInput
                  value={formData.categoryId}
                  invalid={!!errors.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Base Price (₹)" required error={errors.basePrice}>
                  <TextInput
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.basePrice}
                    invalid={!!errors.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  />
                </FormField>
                <FormField label="Unit">
                  <SelectInput
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="LTR">LTR (Liters)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="MTR">MTR (Meters)</option>
                  </SelectInput>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Low Stock Alert Level" required error={errors.lowerStockLimit}>
                  <TextInput
                    placeholder="10"
                    type="number"
                    min="0"
                    value={formData.lowerStockLimit}
                    invalid={!!errors.lowerStockLimit}
                    onChange={(e) => setFormData({ ...formData, lowerStockLimit: e.target.value })}
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
