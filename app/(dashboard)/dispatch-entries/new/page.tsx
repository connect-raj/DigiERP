'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Customer = {
  id: string;
  firmName: string;
  state: string;
  outstandingBalance: string | number;
  creditLimit: string | number;
  gstin?: string | null;
};

type Category = {
  id: string;
  name: string;
  gstRate: string | number;
};

type Product = {
  id: string;
  name: string;
  basePrice: string | number;
  currentStock: string | number;
  category: Category;
};

type LineItem = {
  productId: string;
  quantity: number;
  price: number;
  isCustomPrice: boolean;
  defaultPrice: number;
};

export default function NewDispatchEntryPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [challanNo, setChallanNo] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [place, setPlace] = useState('');
  const [transport, setTransport] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Customer Prices mapping
  const [customerPrices, setCustomerPrices] = useState<Record<string, number>>({});

  // Credit Limit Warning State
  const [creditWarning, setCreditWarning] = useState<{
    customerName: string;
    creditLimit: number;
    outstandingAfter: number;
    show: boolean;
  } | null>(null);

  // Error State
  const [formError, setFormError] = useState<string | null>(null);

  // Load Customers and Products
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [custRes, prodRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/products?isActive=true'),
        ]);
        const custData = await custRes.json();
        const prodData = await prodRes.json();

        if (custData.data) setCustomers(custData.data);
        if (prodData.data) setProducts(prodData.data);
      } catch (error) {
        console.error('Failed to load initial form data', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Fetch customer specific prices when customer changes
  useEffect(() => {
    if (!selectedCustomerId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomerPrices({});
      return;
    }

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/customers/${selectedCustomerId}/prices`);
        const data = await res.json();
        if (data.data) {
          const mapping: Record<string, number> = {};
          data.data.forEach((cp: { productId: string; price: string | number }) => {
            mapping[cp.productId] = Number(cp.price);
          });
          setCustomerPrices(mapping);

          // Update existing line items default price
          setLineItems((prev) =>
            prev.map((item) => {
              const custPrice = mapping[item.productId];
              const prod = products.find((p) => p.id === item.productId);
              const defaultP = custPrice ?? Number(prod?.basePrice ?? 0);
              return {
                ...item,
                defaultPrice: defaultP,
                price: item.isCustomPrice ? item.price : defaultP,
              };
            })
          );
        }
      } catch (error) {
        console.error('Failed to fetch customer specific prices', error);
      }
    };

    fetchPrices();

    // Auto-fill place based on customer if needed, but let user type it.
  }, [selectedCustomerId, products]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [selectedCustomerId, customers]);

  // Handle adding line item
  const handleAddProduct = () => {
    setLineItems((prev) => [
      ...prev,
      {
        productId: '',
        quantity: 1,
        price: 0,
        isCustomPrice: false,
        defaultPrice: 0,
      },
    ]);
  };

  // Handle removing line item
  const handleRemoveItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle updating line item field
  const handleUpdateItem = (index: number, updates: Partial<LineItem>) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const updated = { ...item, ...updates };

        // If product changes, compute its default price
        if (updates.productId !== undefined) {
          const prod = products.find((p) => p.id === updates.productId);
          const custPrice = customerPrices[updates.productId];
          const defaultPrice = custPrice ?? Number(prod?.basePrice ?? 0);
          updated.defaultPrice = defaultPrice;
          updated.price = defaultPrice;
          updated.isCustomPrice = false;
        }

        // If price changes manually, check if it's different from default
        if (updates.price !== undefined) {
          updated.isCustomPrice = Math.abs(updates.price - updated.defaultPrice) > 0.001;
        }

        return updated;
      })
    );
  };

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    products.forEach((p) => {
      const catName = p.category?.name || 'Uncategorized';
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(p);
    });
    return groups;
  }, [products]);

  // Computations
  const gstType = useMemo(() => {
    if (!selectedCustomer) return 'CGST_SGST';
    return selectedCustomer.state.trim().toLowerCase() === 'gujarat' ? 'CGST_SGST' : 'IGST';
  }, [selectedCustomer]);

  const computedItems = useMemo(() => {
    return lineItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const gstRate = prod ? Number(prod.category.gstRate) : 0;
      const baseTotal = item.quantity * item.price;
      const availableStock = prod ? Number(prod.currentStock) : 0;
      const insufficient = item.productId ? item.quantity > availableStock : false;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (gstType === 'CGST_SGST') {
        cgst = (baseTotal * (gstRate / 2)) / 100;
        sgst = (baseTotal * (gstRate / 2)) / 100;
      } else {
        igst = (baseTotal * gstRate) / 100;
      }

      const lineTotal = baseTotal + cgst + sgst + igst;

      return {
        ...item,
        gstRate,
        cgst,
        sgst,
        igst,
        lineTotal,
        availableStock,
        insufficient,
      };
    });
  }, [lineItems, products, gstType]);

  const totals = useMemo(() => {
    let totalAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    computedItems.forEach((item) => {
      totalAmount += item.lineTotal;
      totalCgst += item.cgst;
      totalSgst += item.sgst;
      totalIgst += item.igst;
    });

    return {
      totalAmount,
      totalCgst,
      totalSgst,
      totalIgst,
    };
  }, [computedItems]);

  // Validation
  const hasInsufficientStock = computedItems.some((item) => item.insufficient);
  const isFormValid =
    challanNo.trim() !== '' &&
    selectedCustomerId !== '' &&
    place.trim() !== '' &&
    lineItems.length > 0 &&
    lineItems.every((item) => item.productId !== '' && item.quantity > 0) &&
    !hasInsufficientStock;

  // Submit Handler
  const handleSubmit = async (bypassCreditWarning = false) => {
    if (!isFormValid || submitting) return;

    setFormError(null);

    // Credit limit soft warning validation
    if (selectedCustomer && !bypassCreditWarning) {
      const limit = Number(selectedCustomer.creditLimit);
      const currentOutstanding = Number(selectedCustomer.outstandingBalance);
      const outstandingAfter = currentOutstanding + totals.totalAmount;

      if (outstandingAfter > limit) {
        setCreditWarning({
          customerName: selectedCustomer.firmName,
          creditLimit: limit,
          outstandingAfter,
          show: true,
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/dispatch-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challanNo,
          customerId: selectedCustomerId,
          date: new Date(date).toISOString(),
          place,
          transport: transport || undefined,
          items: lineItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        const errorMsg = result.error?.message || 'Failed to record dispatch entry';
        setFormError(errorMsg);
      } else {
        router.push(`/dispatch-entries/${result.data.id}`);
      }
    } catch (error) {
      console.error('Submission failed', error);
      setFormError('An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  // Indian format helper for currency
  const formatINR = (val: string | number) => {
    const num = Number(val);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="text-on-surface-variant flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-secondary animate-spin text-[32px]">
            progress_activity
          </span>
          <span>Loading form data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="bg-surface-container border-outline-variant flex h-9 w-9 items-center justify-center rounded-lg border-[0.5px] transition-colors hover:bg-[#252525]"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary">New Dispatch Entry</h1>
          <p className="text-on-surface-variant text-body-sm mt-0.5">
            Digitize handwritten challan transactions immediately after dispatch.
          </p>
        </div>
      </div>

      {formError && (
        <div className="text-body-md flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          <span className="material-symbols-outlined mt-0.5 text-[20px]">error</span>
          <div>
            <h5 className="font-bold">Error Recording Entry</h5>
            <p className="text-body-sm mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      {/* Credit Limit Warning Modal / Banner */}
      {creditWarning?.show && (
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-amber-400 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 text-[24px] text-amber-400">
              warning
            </span>
            <div>
              <h5 className="text-body-lg font-bold">Credit Limit Exceeded Warning</h5>
              <p className="text-body-sm mt-1">
                This dispatch pushes{' '}
                <strong className="text-primary">{creditWarning.customerName}</strong> beyond their
                credit limit of{' '}
                <strong className="text-primary">{formatINR(creditWarning.creditLimit)}</strong>.
                Outstanding will become{' '}
                <strong className="text-primary">
                  {formatINR(creditWarning.outstandingAfter)}
                </strong>
                .
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setCreditWarning(null)}
              className="border-outline-variant text-on-surface text-body-sm rounded-lg border-[0.5px] px-4 py-2 font-medium transition-colors hover:bg-[#252525]"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit(true)}
              className="text-body-sm rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black transition-colors hover:bg-amber-500"
            >
              Proceed anyway
            </button>
          </div>
        </div>
      )}

      {/* Top Details Grid */}
      <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
          {/* Challan No */}
          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm text-on-surface-variant font-medium">
              Challan Number *
            </label>
            <input
              type="text"
              placeholder="e.g. 1042"
              value={challanNo}
              onChange={(e) => setChallanNo(e.target.value)}
              className="bg-surface-container-low border-outline-variant text-body-md text-on-surface focus:border-secondary rounded-lg border-[0.5px] px-3.5 py-2 transition-colors outline-none"
            />
            <span className="text-on-surface-variant/70 text-[11px]">
              As written in the physical challan book.
            </span>
          </div>

          {/* Customer */}
          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm text-on-surface-variant font-medium">Customer *</label>
            <div className="relative">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="bg-surface-container-low border-outline-variant text-body-md text-on-surface focus:border-secondary w-full appearance-none rounded-lg border-[0.5px] py-2.5 pr-10 pl-3.5 transition-colors outline-none"
              >
                <option value="">Select Customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firmName}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined text-on-surface-variant pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[18px]">
                expand_more
              </span>
            </div>
            {selectedCustomer && (
              <span className="text-on-surface-variant/80 text-[11px]">
                GSTIN: {selectedCustomer.gstin || 'None'} | Limit:{' '}
                {formatINR(selectedCustomer.creditLimit)}
              </span>
            )}
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm text-on-surface-variant font-medium">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-surface-container-low border-outline-variant text-body-md text-on-surface focus:border-secondary rounded-lg border-[0.5px] px-3.5 py-2 transition-colors outline-none"
            />
          </div>

          {/* Place */}
          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm text-on-surface-variant font-medium">
              Place of Dispatch *
            </label>
            <input
              type="text"
              placeholder="e.g. Ahmedabad"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="bg-surface-container-low border-outline-variant text-body-md text-on-surface focus:border-secondary rounded-lg border-[0.5px] px-3.5 py-2 transition-colors outline-none"
            />
          </div>

          {/* Transport */}
          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm text-on-surface-variant font-medium">
              Transport Name
            </label>
            <input
              type="text"
              placeholder="e.g. Maruti Cargo (Optional)"
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              className="bg-surface-container-low border-outline-variant text-body-md text-on-surface focus:border-secondary rounded-lg border-[0.5px] px-3.5 py-2 transition-colors outline-none"
            />
          </div>
        </div>
      </div>

      {/* Line Items Section */}
      <div className="bg-surface-container border-outline-variant flex flex-col gap-4 rounded-xl border-[0.5px] p-6">
        <h3 className="text-body-lg text-primary font-bold">Line Items</h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-outline-variant/60 border-b-[0.5px] pb-2">
                <th className="font-label-caps text-label-caps text-on-surface-variant pr-4 pb-3 tracking-wider uppercase">
                  Product Details
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant w-32 pr-4 pb-3 tracking-wider uppercase">
                  Available Stock
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant w-28 pr-4 pb-3 tracking-wider uppercase">
                  Quantity
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant w-36 pr-4 pb-3 tracking-wider uppercase">
                  Price (₹)
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant w-40 pr-4 pb-3 tracking-wider uppercase">
                  GST Details
                </th>
                <th className="font-label-caps text-label-caps text-on-surface-variant w-36 pb-3 text-right tracking-wider uppercase">
                  Line Total
                </th>
                <th className="w-12 pb-3"></th>
              </tr>
            </thead>
            <tbody className="divide-outline-variant/20 divide-y">
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-on-surface-variant py-8 text-center">
                    No products added yet. Click &quot;+ Add Product&quot; to record dispatch line
                    items.
                  </td>
                </tr>
              ) : (
                computedItems.map((item, index) => {
                  return (
                    <tr key={index} className="group py-4">
                      {/* Product Selector */}
                      <td className="min-w-[280px] py-3 pr-4">
                        <div className="relative">
                          <select
                            value={item.productId}
                            onChange={(e) => handleUpdateItem(index, { productId: e.target.value })}
                            className="bg-surface-container-low border-outline-variant text-body-md text-on-surface focus:border-secondary w-full appearance-none rounded-lg border-[0.5px] py-2 pr-10 pl-3 outline-none"
                          >
                            <option value="">Select Product...</option>
                            {Object.entries(groupedProducts).map(([category, prods]) => (
                              <optgroup
                                key={category}
                                label={category}
                                className="bg-surface-container-low text-primary"
                              >
                                {prods.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({category})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <span className="material-symbols-outlined text-on-surface-variant pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[18px]">
                            expand_more
                          </span>
                        </div>
                        {item.productId && (
                          <span className="text-on-surface-variant mt-1 block text-[11px]">
                            Category:{' '}
                            <span className="text-secondary font-medium">
                              {products.find((p) => p.id === item.productId)?.category.name}
                            </span>
                          </span>
                        )}
                      </td>

                      {/* Stock Indicator */}
                      <td className="py-3 pr-4">
                        {item.productId ? (
                          <div className="flex items-center">
                            <span
                              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                                item.insufficient
                                  ? 'border-red-500/20 bg-red-500/10 text-red-400'
                                  : 'border-green-500/20 bg-green-500/10 text-green-400'
                              }`}
                            >
                              {item.availableStock} LTR
                            </span>
                            {item.insufficient && (
                              <span className="mt-0.5 ml-1 block text-[10px] font-bold text-red-400">
                                Insufficient!
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-on-surface-variant/40">—</span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          min="1"
                          step="0.001"
                          disabled={!item.productId}
                          value={item.quantity || ''}
                          onChange={(e) =>
                            handleUpdateItem(index, { quantity: Number(e.target.value) })
                          }
                          className="bg-surface-container-low border-outline-variant text-body-md text-on-surface focus:border-secondary w-full rounded-lg border-[0.5px] px-3 py-1.5 font-medium outline-none disabled:opacity-50"
                        />
                      </td>

                      {/* Price Override */}
                      <td className="py-3 pr-4">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!item.productId}
                            value={item.price || ''}
                            onChange={(e) =>
                              handleUpdateItem(index, { price: Number(e.target.value) })
                            }
                            className="bg-surface-container-low border-outline-variant text-body-md text-on-surface focus:border-secondary w-full rounded-lg border-[0.5px] px-3 py-1.5 font-medium outline-none disabled:opacity-50"
                          />
                          {item.productId && (
                            <span className="text-on-surface-variant flex items-center gap-1 text-[10px] font-medium">
                              {item.isCustomPrice ? (
                                <>
                                  <span className="rounded bg-amber-400/10 px-1 text-amber-400">
                                    Custom
                                  </span>
                                  <span>Default: {item.defaultPrice}</span>
                                </>
                              ) : (
                                <span className="bg-secondary/15 text-secondary rounded px-1">
                                  Default
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* GST Split */}
                      <td className="text-body-sm text-on-surface-variant py-3 pr-4 font-medium">
                        {item.productId ? (
                          <div className="flex flex-col">
                            <span>Rate: {item.gstRate}%</span>
                            {gstType === 'CGST_SGST' ? (
                              <span className="text-[11px]">
                                CGST: {formatINR(item.cgst)} | SGST: {formatINR(item.sgst)}
                              </span>
                            ) : (
                              <span className="text-[11px]">IGST: {formatINR(item.igst)}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-on-surface-variant/40">—</span>
                        )}
                      </td>

                      {/* Line Total */}
                      <td className="text-primary py-3 text-right font-semibold">
                        {item.productId ? formatINR(item.lineTotal) : formatINR(0)}
                      </td>

                      {/* Remove Button */}
                      <td className="py-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-on-surface-variant p-1 transition-colors hover:text-red-400"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={handleAddProduct}
          className="border-outline-variant text-secondary font-body-sm flex items-center gap-1 self-start rounded-lg border-[0.5px] px-4 py-2 font-semibold transition-colors hover:bg-[#252525]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Product
        </button>
      </div>

      {/* Sticky Bottom Footer */}
      <div className="fixed right-0 bottom-0 left-[260px] z-40 flex items-center justify-between border-t border-[#2e2e2e] bg-[#1e1e1e] px-10 py-4 shadow-2xl">
        <div className="flex items-center gap-6">
          {totals.totalCgst > 0 && (
            <div className="text-body-sm text-on-surface-variant">
              Total CGST:{' '}
              <span className="text-primary font-semibold">{formatINR(totals.totalCgst)}</span>
            </div>
          )}
          {totals.totalSgst > 0 && (
            <div className="text-body-sm text-on-surface-variant">
              Total SGST:{' '}
              <span className="text-primary font-semibold">{formatINR(totals.totalSgst)}</span>
            </div>
          )}
          {totals.totalIgst > 0 && (
            <div className="text-body-sm text-on-surface-variant">
              Total IGST:{' '}
              <span className="text-primary font-semibold">{formatINR(totals.totalIgst)}</span>
            </div>
          )}
          <div className="h-6 w-[1px] bg-[#2e2e2e]"></div>
          <div className="text-body-md text-on-surface font-medium">
            Grand Total:{' '}
            <span className="font-data-tabular text-secondary text-headline-sm font-bold">
              {formatINR(totals.totalAmount)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dispatch-entries"
            className="border-outline-variant text-on-surface text-body-md rounded-lg border-[0.5px] px-5 py-2 font-semibold transition-colors hover:bg-[#252525]"
          >
            Cancel
          </Link>
          <button
            onClick={() => handleSubmit(false)}
            disabled={!isFormValid || submitting}
            className={`font-body-md flex items-center gap-2 rounded-lg px-6 py-2 font-bold transition-all ${
              isFormValid && !submitting
                ? 'bg-secondary-container hover:bg-secondary-container/85 text-on-secondary-container cursor-pointer'
                : 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-50'
            }`}
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  progress_activity
                </span>
                Recording...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                Record Dispatch Entry
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
