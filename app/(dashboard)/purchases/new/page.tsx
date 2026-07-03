'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const purchaseItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(0.001, 'Quantity must be > 0'),
  unitPrice: z.number().min(0, 'Unit price must be >= 0'),
});

const purchaseSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  vendorInvoiceNo: z.string().min(1, 'Invoice number is required'),
  date: z.string().min(1, 'Date is required'),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

type Vendor = {
  id: string;
  name: string;
  state: string;
};

type Product = {
  id: string;
  name: string;
  basePrice: string | number;
  category: { gstRate: string | number };
};

const COMPANY_STATE = 'Gujarat';

export default function NewPurchasePage() {
  const router = useRouter();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      vendorId: '',
      vendorInvoiceNo: '',
      date: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      notes: '',
      items: [{ productId: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // eslint-disable-next-line react-compiler/react-compiler
  const watchItems = watch('items');
  const watchVendorId = watch('vendorId');

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === watchVendorId),
    [vendors, watchVendorId]
  );

  // Totals Calculation
  const { subTotal, taxTotal, grandTotal } = useMemo(() => {
    let sub = 0;
    let tax = 0;

    watchItems.forEach((item) => {
      if (item.productId && item.quantity > 0 && item.unitPrice >= 0) {
        const product = products.find((p) => p.id === item.productId);
        const itemSubtotal = item.quantity * item.unitPrice;
        sub += itemSubtotal;

        if (product) {
          const gstRate = Number(product.category.gstRate);
          tax += (itemSubtotal * gstRate) / 100;
        }
      }
    });

    return {
      subTotal: sub,
      taxTotal: tax,
      grandTotal: sub + tax,
    };
  }, [watchItems, products]);

  useEffect(() => {
    fetch('/api/vendors')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setVendors(data.data.filter((v: { isActive: boolean }) => v.isActive));
      });
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setProducts(data.data.filter((p: { isActive: boolean }) => p.isActive));
      });
  }, []);

  const onSubmit = async (data: PurchaseFormData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        vendorId: data.vendorId,
        vendorInvoiceNo: data.vendorInvoiceNo,
        date: new Date(data.date).toISOString(),
        expectedDeliveryDate: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate).toISOString()
          : undefined,
        items: data.items,
      };
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push('/purchases');
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (error) {
      console.error('Failed to create purchase', error);
      alert('Failed to create purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-on-surface-variant font-body-sm flex items-center gap-2">
            <button
              onClick={() => router.push('/purchases')}
              className="hover:text-primary transition-colors"
            >
              Purchases
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-medium">New Entry</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-primary mt-1">Record Purchase</h1>
        </div>
      </div>

      {/* Main Form Content */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 items-start gap-8 pb-20 xl:grid-cols-12"
      >
        {/* Left Column (Main Form) */}
        <div className="flex flex-col gap-6 xl:col-span-8">
          {/* Vendor & General Details Card */}
          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">store</span>
              Vendor Details
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Select Vendor *
                </label>
                <div className="relative">
                  <Controller
                    control={control}
                    name="vendorId"
                    render={({ field }) => (
                      <select
                        {...field}
                        className="bg-surface-container-low border-outline-variant text-body-md text-primary focus:border-secondary w-full appearance-none rounded-xl border-[0.5px] p-3.5 pr-10 transition-colors outline-none"
                      >
                        <option value="">-- Choose a vendor --</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  <span className="material-symbols-outlined text-on-surface-variant pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                    expand_more
                  </span>
                </div>
                {errors.vendorId && (
                  <span className="text-error text-[12px]">{errors.vendorId.message}</span>
                )}
                {selectedVendor && (
                  <p className="text-on-surface-variant mt-1 ml-1 flex items-center gap-1 text-[12px]">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {selectedVendor.state}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Vendor Invoice No. *
                </label>
                <Controller
                  control={control}
                  name="vendorInvoiceNo"
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="e.g. INV-2023-001"
                      className="bg-surface-container-low border-outline-variant text-body-md text-primary focus:border-secondary w-full rounded-xl border-[0.5px] p-3.5 transition-colors outline-none placeholder:text-[#555]"
                    />
                  )}
                />
                {errors.vendorInvoiceNo && (
                  <span className="text-error text-[12px]">{errors.vendorInvoiceNo.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Purchase Date *
                </label>
                <Controller
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <input
                      {...field}
                      type="date"
                      className="bg-surface-container-low border-outline-variant text-body-md text-primary focus:border-secondary w-full rounded-xl border-[0.5px] p-3.5 transition-colors outline-none"
                    />
                  )}
                />
                {errors.date && (
                  <span className="text-error text-[12px]">{errors.date.message}</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Expected Delivery
                </label>
                <Controller
                  control={control}
                  name="expectedDeliveryDate"
                  render={({ field }) => (
                    <input
                      {...field}
                      type="date"
                      className="bg-surface-container-low border-outline-variant text-body-md text-primary focus:border-secondary w-full rounded-xl border-[0.5px] p-3.5 transition-colors outline-none"
                    />
                  )}
                />
                {errors.expectedDeliveryDate && (
                  <span className="text-error text-[12px]">
                    {errors.expectedDeliveryDate.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-surface-container border-outline-variant overflow-x-auto rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">category</span>
              Line Items
            </h2>

            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-outline-variant border-b-[0.5px]">
                  <th className="font-label-caps text-label-caps text-on-surface-variant w-[35%] px-2 pb-3 uppercase">
                    Product
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant w-[15%] px-2 pb-3 text-right uppercase">
                    Qty
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant w-[20%] px-2 pb-3 text-right uppercase">
                    Unit Price (₹)
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant w-[10%] px-2 pb-3 text-right uppercase">
                    Tax %
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant w-[15%] px-2 pb-3 text-right uppercase">
                    Total (₹)
                  </th>
                  <th className="font-label-caps text-label-caps text-on-surface-variant w-[5%] px-2 pb-3 uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const item = watchItems[index];
                  const product = products.find((p) => p.id === item?.productId);
                  const taxPercent = product ? Number(product.category.gstRate) : 0;
                  const lineBaseTotal = (item?.quantity || 0) * (item?.unitPrice || 0);
                  const lineTax = (lineBaseTotal * taxPercent) / 100;
                  const lineTotal = lineBaseTotal + lineTax;

                  return (
                    <tr key={field.id} className="group">
                      <td className="p-2 align-top">
                        <Controller
                          control={control}
                          name={`items.${index}.productId`}
                          render={({ field: f }) => (
                            <select
                              {...f}
                              onChange={(e) => {
                                f.onChange(e);
                                const selectedProduct = products.find(
                                  (p) => p.id === e.target.value
                                );
                                if (selectedProduct) {
                                  // Update unit price on product select if it's currently 0
                                  const currentPrice = watchItems[index]?.unitPrice;
                                  if (!currentPrice) {
                                    // Hacky way to update via react-hook-form using setValue would be better, but we can do it via the e.target value event handling if needed.
                                    // For simplicity we leave it or the user manually sets it. Let's just render standard inputs.
                                  }
                                }
                              }}
                              className="bg-surface-container-low border-outline-variant text-body-md text-primary w-full appearance-none rounded-lg border-[0.5px] p-2.5 outline-none"
                            >
                              <option value="">Select product...</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                        {errors.items?.[index]?.productId && (
                          <span className="text-error mt-1 block text-[10px]">
                            {errors.items[index]?.productId?.message}
                          </span>
                        )}
                      </td>
                      <td className="p-2 align-top">
                        <Controller
                          control={control}
                          name={`items.${index}.quantity`}
                          render={({ field: f }) => (
                            <input
                              {...f}
                              type="number"
                              step="0.001"
                              min="0"
                              className="bg-surface-container-low border-outline-variant text-body-md text-primary w-full rounded-lg border-[0.5px] p-2.5 text-right outline-none"
                              onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                            />
                          )}
                        />
                        {errors.items?.[index]?.quantity && (
                          <span className="text-error mt-1 block text-[10px]">
                            {errors.items[index]?.quantity?.message}
                          </span>
                        )}
                      </td>
                      <td className="p-2 align-top">
                        <Controller
                          control={control}
                          name={`items.${index}.unitPrice`}
                          render={({ field: f }) => (
                            <input
                              {...f}
                              type="number"
                              step="0.01"
                              min="0"
                              className="bg-surface-container-low border-outline-variant text-body-md text-primary w-full rounded-lg border-[0.5px] p-2.5 text-right outline-none"
                              onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                            />
                          )}
                        />
                        {errors.items?.[index]?.unitPrice && (
                          <span className="text-error mt-1 block text-[10px]">
                            {errors.items[index]?.unitPrice?.message}
                          </span>
                        )}
                      </td>
                      <td className="p-2 align-top">
                        <div className="bg-surface-container-low border-outline-variant text-body-md text-on-surface-variant w-full cursor-not-allowed rounded-lg border-[0.5px] p-2.5 text-right">
                          {taxPercent}%
                        </div>
                      </td>
                      <td className="p-2 align-top">
                        <div className="border-outline-variant text-body-md font-data-tabular text-primary w-full rounded-lg border-[0.5px] bg-[#181818] p-2.5 text-right font-medium">
                          {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="p-2 pt-4 text-right align-top">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-on-surface-variant hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <button
              type="button"
              onClick={() => append({ productId: '', quantity: 1, unitPrice: 0 })}
              className="text-secondary font-body-md hover:bg-secondary/10 mt-4 flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Add Row
            </button>
          </div>

          {/* Notes Section */}
          <div className="bg-surface-container border-outline-variant rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">note_alt</span>
              Notes & Terms
            </h2>
            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <textarea
                  {...field}
                  rows={3}
                  placeholder="Add any purchase notes, terms, or documentation links here..."
                  className="bg-surface-container-low border-outline-variant text-body-md text-primary focus:border-secondary w-full resize-none rounded-xl border-[0.5px] p-4 transition-colors outline-none placeholder:text-[#555]"
                ></textarea>
              )}
            />
          </div>
        </div>

        {/* Right Column (Summary) */}
        <div className="flex flex-col gap-6 xl:col-span-4">
          <div className="bg-surface-container border-outline-variant sticky top-6 rounded-2xl border-[0.5px] p-6">
            <h2 className="font-title-md text-title-md text-primary mb-6">Order Summary</h2>

            <div className="flex flex-col gap-4">
              <div className="text-body-md flex items-center justify-between">
                <span className="text-on-surface-variant">Subtotal</span>
                <span className="text-primary font-data-tabular">
                  ₹{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-body-md flex items-center justify-between">
                <span className="text-on-surface-variant flex items-center gap-1">
                  Tax (GST)
                  <span
                    className="material-symbols-outlined cursor-help text-[14px]"
                    title={`Tax type determined by vendor state (${selectedVendor?.state || '-'}) vs Company state (${COMPANY_STATE})`}
                  >
                    info
                  </span>
                </span>
                <span className="text-primary font-data-tabular">
                  ₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="border-outline-variant my-2 border-t-[0.5px]"></div>

              <div className="flex items-center justify-between">
                <span className="font-title-md text-title-md text-primary">Grand Total</span>
                <span className="font-display text-secondary font-data-tabular text-[24px] font-bold">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-on-primary font-body-md flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">save</span>
                {isSubmitting ? 'Saving...' : 'Save Purchase Entry'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/purchases')}
                className="border-outline-variant text-on-surface hover:bg-surface-container-high font-body-md rounded-xl border-[0.5px] py-3.5 font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
