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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/categories', {
        method: 'POST',
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
        fetchCategories();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to create category', error);
      alert('Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full gap-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-display text-on-surface">Categories</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Manage industrial classifications and taxation parameters.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-body-md font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add Category
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1c1c1c] border-[0.5px] border-[#333] p-5 rounded-xl">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Total Categories</p>
          <p className="font-display text-display text-primary mt-2">{categories.length}</p>
        </div>
        <div className="bg-[#1c1c1c] border-[0.5px] border-[#333] p-5 rounded-xl">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Avg. GST Rate</p>
          <p className="font-display text-display text-secondary mt-2">
            {categories.length > 0 
              ? (categories.reduce((acc, c) => acc + c.gstRate, 0) / categories.length).toFixed(1) 
              : '0'}%
          </p>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-[#1c1c1c] border-[0.5px] border-[#333] rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#222] border-b-[0.5px] border-[#333]">
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase tracking-wider">HSN Code</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase tracking-wider">GST Rate</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase tracking-wider text-right">Products Count</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-[0.5px] divide-[#333]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">Loading categories...</td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">No categories found.</td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-[#252525] transition-colors group">
                  <td className="px-6 py-4 font-semibold text-primary">{category.name}</td>
                  <td className="px-6 py-4 font-data-tabular text-on-surface-variant">{category.hsnCode}</td>
                  <td className="px-6 py-4">
                    <span className="bg-secondary/15 text-secondary px-2 py-1 rounded font-data-tabular text-[12px]">{category.gstRate}%</span>
                  </td>
                  <td className="px-6 py-4 text-right font-data-tabular text-on-surface">{category._count?.products || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 text-outline hover:text-primary transition-all opacity-0 group-hover:opacity-100">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-[#1c1c1c] border-[0.5px] border-[#444] rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-md text-headline-md text-primary">Add New Category</h3>
              <button className="material-symbols-outlined text-outline hover:text-primary" onClick={() => setIsModalOpen(false)}>close</button>
            </div>
            <form className="space-y-4" onSubmit={handleCreateCategory}>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Category Name</label>
                <input 
                  className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none" 
                  placeholder="e.g. UV Curable Inks" 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">HSN Code</label>
                  <input 
                    className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none" 
                    placeholder="8 digits" 
                    type="text" 
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">GST Rate (%)</label>
                  <select 
                    className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none appearance-none"
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
              <div className="flex gap-4 pt-4 mt-6 border-t-[0.5px] border-[#333]">
                <button className="flex-1 border-[0.5px] border-[#444] text-primary rounded-lg py-2.5 font-semibold hover:bg-[#252525] transition-all" onClick={() => setIsModalOpen(false)} type="button" disabled={isSubmitting}>Cancel</button>
                <button className="flex-1 bg-primary text-background rounded-lg py-2.5 font-semibold hover:bg-opacity-90 transition-all disabled:opacity-50" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
