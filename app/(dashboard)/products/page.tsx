'use client';

import React, { useState, useEffect } from 'react';
import Pagination from '@/components/ui/Pagination';

const PAGE_LIMIT = 10;

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
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error(`Failed to ${editingId ? 'update' : 'create'} product`, error);
      alert(`Failed to ${editingId ? 'update' : 'create'} product`);
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

  return (
    <div className="flex h-full flex-col gap-8">
      {/* Controls Container */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Search */}
        <div className="flex h-[52px] items-center rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] p-1 transition-colors focus-within:border-[#555] md:col-span-9">
          <span className="material-symbols-outlined px-3 text-[#8e9192]">search</span>
          <input
            className="text-on-surface font-body-md h-full w-full border-none bg-transparent p-0 text-[13px] placeholder:text-[#8e9192] focus:ring-0"
            placeholder="Search products by name or category..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex justify-end md:col-span-3">
          <button
            onClick={openCreateModal}
            className="bg-primary text-background font-body-md hover:bg-opacity-90 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl font-bold shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add Product
          </button>
        </div>
        {/* Filters */}
        <div className="flex gap-4 md:col-span-12">
          <div className="group relative flex flex-1 items-center justify-between rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] px-4 transition-colors hover:border-[#555]">
            <select
              className="font-body-md h-full w-full cursor-pointer appearance-none border-none bg-transparent text-[13px] text-[#c4c7c8] outline-none"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Category: All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none text-[#8e9192]">
              arrow_drop_down
            </span>
          </div>
          <div className="group relative flex flex-1 cursor-pointer items-center justify-between rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] px-4 transition-colors hover:border-[#555]">
            <span className="font-body-md text-[13px] text-[#c4c7c8]">Status: Active</span>
            <span className="material-symbols-outlined text-[#8e9192]">arrow_drop_down</span>
          </div>
          <button className="flex items-center justify-center rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] px-4 text-[#8e9192] transition-colors hover:bg-[#252525]">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="flex min-h-[500px] flex-col overflow-hidden rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-[0.5px] border-[#333] bg-[#222]">
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 tracking-widest uppercase">
                Name & SKU
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 tracking-widest uppercase">
                Category
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 text-right tracking-widest uppercase">
                Price
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 tracking-widest uppercase">
                Stock
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 tracking-widest uppercase">
                Status
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 text-right tracking-widest uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-[0.5px] divide-[#333]">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-on-surface-variant px-6 py-8 text-center">
                  Loading products...
                </td>
              </tr>
            ) : pagination.total === 0 ? (
              <tr>
                <td colSpan={6} className="text-on-surface-variant px-6 py-8 text-center">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="group transition-colors hover:bg-[#252525]">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-primary font-semibold">{product.name}</span>
                      <span className="text-on-surface-variant font-data-tabular text-[11px] tracking-wider uppercase">
                        {product.sku}
                      </span>
                    </div>
                  </td>
                  <td className="text-on-surface-variant px-6 py-4 text-[13px]">
                    {product.category?.name || 'Uncategorized'}
                  </td>
                  <td className="font-data-tabular text-primary px-6 py-4 text-right text-[13px]">
                    ₹ {Number(product.basePrice).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-data-tabular text-[13px] ${product.currentStock < product.lowerStockLimit ? 'text-error font-bold' : 'text-primary'}`}
                      >
                        {product.currentStock} {product.unit}
                      </span>
                      {product.currentStock < product.lowerStockLimit && (
                        <span className="bg-error/10 text-error rounded px-2 py-0.5 text-[10px] font-bold tracking-tighter uppercase">
                          Low
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {product.isActive ? (
                      <span className="inline-flex items-center rounded bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="bg-outline-variant/20 text-outline inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-outline hover:text-primary rounded-md p-1.5 transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="text-outline hover:text-error rounded-md p-1.5 transition-colors"
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

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
          <div className="animate-in zoom-in-95 w-full max-w-md rounded-2xl border-[0.5px] border-[#333] bg-[#1c1c1c] p-6 shadow-2xl duration-200">
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
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                  Product Name
                </label>
                <input
                  className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                  placeholder="e.g. Cyan Ink 1Ltr"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                  Category
                </label>
                <select
                  className="text-body-md text-primary focus:border-secondary-container w-full appearance-none rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    Base Price (₹)
                  </label>
                  <input
                    className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    Unit
                  </label>
                  <select
                    className="text-body-md text-primary focus:border-secondary-container w-full appearance-none rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="LTR">LTR (Liters)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="MTR">MTR (Meters)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    Low Stock Alert Level
                  </label>
                  <input
                    className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    placeholder="10"
                    type="number"
                    min="0"
                    value={formData.lowerStockLimit}
                    onChange={(e) => setFormData({ ...formData, lowerStockLimit: e.target.value })}
                    required
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
