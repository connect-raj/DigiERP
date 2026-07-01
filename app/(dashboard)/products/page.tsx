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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/products', window.location.origin);
      if (search) url.searchParams.append('search', search);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
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
        {/* Filters */}
        <div className="md:col-span-7 flex gap-4 h-[52px]">
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
    </div>
  );
}
