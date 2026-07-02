'use client';

import React, { useState, useEffect } from 'react';

type Product = {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  category?: { name: string };
  basePrice: number;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  isActive: boolean;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/products', window.location.origin);
      if (search) url.searchParams.append('search', search);
      
      const [prodRes, catRes] = await Promise.all([
        fetch(url.toString()),
        fetch('/api/categories')
      ]);
      
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      
      if (prodData.data) {
        setProducts(prodData.data);
      }
      if (catData.data) {
        setCategories(catData.data);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
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
      lowerStockLimit: product.minStockLevel.toString(),
      isActive: product.isActive,
    });
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData({ name: '', categoryId: '', basePrice: '', unit: 'LTR', lowerStockLimit: '10', isActive: true });
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
        setFormData({ name: '', categoryId: '', basePrice: '', unit: 'LTR', lowerStockLimit: '10', isActive: true });
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
    if (!window.confirm(`Are you sure you want to delete the product "${name}"? This action cannot be undone.`)) {
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
    fetchProducts();
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full gap-8">
      {/* Controls Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Search */}
        <div className="md:col-span-5 bg-[#1c1c1c] border-[0.5px] border-[#333] rounded-xl p-1 flex items-center h-[52px] focus-within:border-[#555] transition-colors">
          <span className="material-symbols-outlined text-[#8e9192] px-3">search</span>
          <input 
            className="w-full bg-transparent border-none text-on-surface placeholder:text-[#8e9192] focus:ring-0 font-body-md text-[13px] p-0 h-full" 
            placeholder="Search products by name, SKU, or category..." 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button 
            onClick={openCreateModal}
            className="w-full h-[52px] bg-primary text-background rounded-xl font-bold font-body-md flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add Product
          </button>
        </div>
        {/* Filters */}
        <div className="md:col-span-12 flex gap-4">
          <div className="flex-1 bg-[#1c1c1c] border-[0.5px] border-[#333] rounded-xl px-4 flex items-center justify-between relative group cursor-pointer hover:border-[#555] transition-colors">
            <span className="text-[#c4c7c8] font-body-md text-[13px]">Category: All</span>
            <span className="material-symbols-outlined text-[#8e9192]">arrow_drop_down</span>
          </div>
          <div className="flex-1 bg-[#1c1c1c] border-[0.5px] border-[#333] rounded-xl px-4 flex items-center justify-between relative group cursor-pointer hover:border-[#555] transition-colors">
            <span className="text-[#c4c7c8] font-body-md text-[13px]">Status: Active</span>
            <span className="material-symbols-outlined text-[#8e9192]">arrow_drop_down</span>
          </div>
          <button className="bg-[#1c1c1c] border-[0.5px] border-[#333] text-[#8e9192] px-4 rounded-xl flex items-center justify-center hover:bg-[#252525] transition-colors">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[#1c1c1c] border-[0.5px] border-[#333] rounded-xl overflow-hidden flex flex-col min-h-[500px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-[0.5px] border-[#333] bg-[#222]">
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline tracking-widest uppercase">Name & SKU</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline tracking-widest uppercase">Category</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline tracking-widest uppercase text-right">Price</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline tracking-widest uppercase">Stock</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline tracking-widest uppercase">Status</th>
              <th className="px-6 py-4 font-label-caps text-label-caps text-outline tracking-widest uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-[0.5px] divide-[#333]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">Loading products...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">No products found.</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-[#252525] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-primary">{product.name}</span>
                      <span className="text-[11px] text-on-surface-variant font-data-tabular uppercase tracking-wider">{product.sku}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant text-[13px]">
                    {product.category?.name || 'Uncategorized'}
                  </td>
                  <td className="px-6 py-4 text-right font-data-tabular text-[13px] text-primary">
                    ₹ {Number(product.basePrice).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-data-tabular text-[13px] ${product.currentStock < product.minStockLevel ? 'text-error font-bold' : 'text-primary'}`}>
                        {product.currentStock} {product.unit}
                      </span>
                      {product.currentStock < product.minStockLevel && (
                        <span className="bg-error/10 text-error text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-tighter">Low</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {product.isActive ? (
                       <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-green-500/10 text-green-400">Active</span>
                    ) : (
                       <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-outline-variant/20 text-outline">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(product)}
                        className="p-1.5 text-outline hover:text-primary transition-colors rounded-md"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id, product.name)}
                        className="p-1.5 text-outline hover:text-error transition-colors rounded-md"
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

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#1c1c1c] border-[0.5px] border-[#333] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline-md text-headline-md text-primary">
                {editingId ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button className="material-symbols-outlined text-outline hover:text-primary" onClick={() => setIsModalOpen(false)}>close</button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Product Name</label>
                <input 
                  className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none" 
                  placeholder="e.g. Cyan Ink 1Ltr" 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Category</label>
                <select 
                  className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none appearance-none"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Base Price (₹)</label>
                  <input 
                    className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none" 
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
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Unit</label>
                  <select 
                    className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none appearance-none"
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
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Low Stock Alert Level</label>
                  <input 
                    className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none" 
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
                    <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Status</label>
                    <select 
                      className="w-full bg-[#141313] border-[0.5px] border-[#333] rounded-lg p-3 text-body-md text-primary focus:border-secondary-container outline-none appearance-none"
                      value={formData.isActive.toString()}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
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
