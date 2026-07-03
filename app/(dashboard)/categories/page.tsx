'use client';

import React, { useState, useEffect } from 'react';

type Category = {
  id: string;
  name: string;
  hsnCode: string;
  gstRate: number;
  description: string | null;
  _count?: {
    products: number;
  };
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    hsnCode: '',
    gstRate: '18',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.data) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (category: Category) => {
    setFormData({
      name: category.name,
      hsnCode: category.hsnCode,
      gstRate: category.gstRate.toString(),
    });
    setEditingId(category.id);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData({ name: '', hsnCode: '', gstRate: '18' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          hsnCode: formData.hsnCode,
          gstRate: Number(formData.gstRate),
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: '', hsnCode: '', gstRate: '18' });
        setEditingId(null);
        fetchCategories();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error(`Failed to ${editingId ? 'update' : 'create'} category`, error);
      alert(`Failed to ${editingId ? 'update' : 'create'} category`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the category "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchCategories();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to delete category', error);
      alert('Failed to delete category');
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchCategories();
  }, []);

  return (
    <div className="flex h-full flex-col gap-8">
      {/* Header Section */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-display text-on-surface">Categories</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Manage industrial classifications and taxation parameters.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary text-on-primary font-body-md hover:bg-opacity-90 flex items-center gap-2 rounded-lg px-6 py-2.5 font-bold transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add Category
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] p-5">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">
            Total Categories
          </p>
          <p className="font-display text-display text-primary mt-2">{categories.length}</p>
        </div>
        <div className="rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] p-5">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">
            Avg. GST Rate
          </p>
          <p className="font-display text-display text-secondary mt-2">
            {categories.length > 0
              ? (categories.reduce((acc, c) => acc + c.gstRate, 0) / categories.length).toFixed(1)
              : '0'}
            %
          </p>
        </div>
      </div>

      {/* Categories Table */}
      <div className="overflow-hidden rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-[0.5px] border-[#333] bg-[#222]">
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 tracking-wider uppercase">
                Name
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 tracking-wider uppercase">
                HSN Code
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 tracking-wider uppercase">
                GST Rate
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 text-right tracking-wider uppercase">
                Products Count
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 text-right tracking-wider uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-[0.5px] divide-[#333]">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-on-surface-variant px-6 py-8 text-center">
                  Loading categories...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-on-surface-variant px-6 py-8 text-center">
                  No categories found.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="group transition-colors hover:bg-[#252525]">
                  <td className="text-primary px-6 py-4 font-semibold">{category.name}</td>
                  <td className="font-data-tabular text-on-surface-variant px-6 py-4">
                    {category.hsnCode}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-secondary/15 text-secondary font-data-tabular rounded px-2 py-1 text-[12px]">
                      {category.gstRate}%
                    </span>
                  </td>
                  <td className="font-data-tabular text-on-surface px-6 py-4 text-right">
                    {category._count?.products || 0}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => openEditModal(category)}
                        className="text-outline hover:text-primary rounded-md p-1.5 transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(category.id, category.name)}
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
      </div>

      {/* Add Category Modal (Simplified) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-md rounded-xl border-[0.5px] border-[#444] bg-[#1c1c1c] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-primary">
                {editingId ? 'Edit Category' : 'Add New Category'}
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
                  Category Name
                </label>
                <input
                  className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                  placeholder="e.g. UV Curable Inks"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    HSN Code
                  </label>
                  <input
                    className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    placeholder="8 digits"
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    GST Rate (%)
                  </label>
                  <select
                    className="text-body-md text-primary focus:border-secondary-container w-full appearance-none rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                  >
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
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
