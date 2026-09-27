'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar, FilterSelect } from '@/components/ui/ListToolbar';
import { FormField, SelectInput, SubmitError, TextInput } from '@/components/ui/form';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

const PAGE_LIMIT = 20;

type Kind = 'INK' | 'MACHINE' | 'SPARE_PART';

const KIND_LABEL: Record<Kind, string> = {
  INK: 'Ink',
  MACHINE: 'Machine',
  SPARE_PART: 'Spare Part',
};

type LineOption = {
  id: string;
  name: string;
  kind: Kind;
  role: { usesColours: boolean } | null;
  colourSet: { colours: { colourId: string; colour: { id: string; name: string } }[] } | null;
};

type UnitOption = { id: string; name: string; appliesTo: Kind[] };

type Product = {
  id: string;
  name: string;
  lineId: string;
  line: { id: string; name: string; kind: Kind };
  unitId: string;
  unit: { id: string; name: string };
  packSize: string | number | null;
  colourId: string | null;
  basePrice: string | number;
  currentStock: string | number;
  lowerStockLimit: string | number;
  isActive: boolean;
};

function generateInkName(
  lineName: string,
  colourName: string | undefined,
  packSize: string,
  unitName: string | undefined
): string {
  const parts = [lineName];
  if (colourName) parts.push(colourName);
  if (packSize.trim() && unitName) parts.push(`${packSize.trim()} ${unitName}`);
  return parts.join(' – ');
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<LineOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lineFilterId, setLineFilterId] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lineSearch, setLineSearch] = useState('');
  const [formData, setFormData] = useState({
    lineId: '',
    name: '',
    unitId: '',
    packSize: '',
    colourId: '',
    basePrice: '0',
    lowerStockLimit: '10',
    isActive: true,
  });

  const emptyFormData = {
    lineId: '',
    name: '',
    unitId: '',
    packSize: '',
    colourId: '',
    basePrice: '0',
    lowerStockLimit: '10',
    isActive: true,
  };

  const fetchLines = async () => {
    try {
      // Line dropdown needs the full active list, not a paginated page.
      const res = await fetch('/api/product-lines?limit=1000&isActive=true');
      const data = await res.json();
      if (data.data) setLines(data.data);
    } catch (error) {
      console.error('Failed to fetch product lines', error);
      showErrorToast(error, 'Failed to load product lines');
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units?limit=1000&isActive=true');
      const data = await res.json();
      if (data.data) setUnits(data.data);
    } catch (error) {
      console.error('Failed to fetch units', error);
      showErrorToast(error, 'Failed to load units');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/products', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (lineFilterId) url.searchParams.append('lineId', lineFilterId);
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
      showErrorToast(error, 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (product: Product) => {
    setFormData({
      lineId: product.lineId,
      name: product.name,
      unitId: product.unitId,
      packSize: product.packSize !== null ? product.packSize.toString() : '',
      colourId: product.colourId ?? '',
      basePrice: product.basePrice.toString(),
      lowerStockLimit: product.lowerStockLimit.toString(),
      isActive: product.isActive,
    });
    setEditingId(product.id);
    setErrors({});
    setSubmitError(null);
    setLineSearch('');
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData(emptyFormData);
    setEditingId(null);
    setErrors({});
    setSubmitError(null);
    setLineSearch('');
    setIsModalOpen(true);
  };

  const selectedLine = useMemo(
    () => lines.find((l) => l.id === formData.lineId),
    [lines, formData.lineId]
  );
  const kind = selectedLine?.kind;
  const usesColours = kind === 'INK' && !!selectedLine?.role?.usesColours;
  const colourOptions = selectedLine?.colourSet?.colours ?? [];
  const unitsForKind = useMemo(
    () => (kind ? units.filter((u) => u.appliesTo.includes(kind)) : []),
    [units, kind]
  );
  const selectedUnit = units.find((u) => u.id === formData.unitId);
  const selectedColour = colourOptions.find((c) => c.colourId === formData.colourId)?.colour;
  const previewName =
    kind === 'INK'
      ? generateInkName(
          selectedLine?.name ?? '',
          selectedColour?.name,
          formData.packSize,
          selectedUnit?.name
        )
      : formData.name;

  const filteredLines = useMemo(() => {
    if (!lineSearch.trim()) return lines;
    const q = lineSearch.trim().toLowerCase();
    return lines.filter((l) => l.name.toLowerCase().includes(q));
  }, [lines, lineSearch]);

  const linesByKind = useMemo(() => {
    const groups: Record<Kind, LineOption[]> = { INK: [], MACHINE: [], SPARE_PART: [] };
    for (const l of filteredLines) groups[l.kind].push(l);
    return groups;
  }, [filteredLines]);

  const handleLineChange = (newLineId: string) => {
    const newLine = lines.find((l) => l.id === newLineId);
    setFormData((prev) => ({
      ...prev,
      lineId: newLineId,
      // Kind-specific fields don't carry over across a line change.
      name: newLine?.kind === 'INK' ? '' : prev.name,
      unitId: '',
      packSize: newLine?.kind === 'INK' ? prev.packSize : '',
      colourId: '',
    }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!formData.lineId) next.lineId = 'Product line is required.';
    if (!formData.unitId) next.unitId = 'Unit is required.';
    if (kind === 'INK') {
      if (!formData.packSize.trim() || Number(formData.packSize) <= 0) {
        next.packSize = 'Enter a valid pack size.';
      }
      if (usesColours && !formData.colourId) {
        next.colourId = 'Colour is required for this line.';
      }
    } else if (kind) {
      if (!formData.name.trim()) next.name = 'Product name is required.';
    }
    if (formData.basePrice.trim() && Number(formData.basePrice) < 0) {
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

      const payload: Record<string, unknown> = {
        lineId: formData.lineId,
        unitId: formData.unitId,
        basePrice: formData.basePrice.trim() ? Number(formData.basePrice) : 0,
        lowerStockLimit: Number(formData.lowerStockLimit),
        ...(editingId ? { isActive: formData.isActive } : {}),
      };
      if (kind === 'INK') {
        payload.packSize = Number(formData.packSize);
        payload.colourId = formData.colourId || undefined;
      } else {
        payload.name = formData.name;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData(emptyFormData);
        setEditingId(null);
        showSuccessToast(editingId ? 'Product updated' : 'Product created');
        fetchProducts();
      } else {
        const error = await res.json();
        setSubmitError(error.error?.message ?? error.message ?? 'Failed to save product.');
        showErrorToast(error, `Failed to ${editingId ? 'update' : 'create'} product`);
      }
    } catch (error) {
      console.error(`Failed to ${editingId ? 'update' : 'create'} product`, error);
      setSubmitError(`Failed to ${editingId ? 'update' : 'create'} product.`);
      showErrorToast(error, `Failed to ${editingId ? 'update' : 'create'} product`);
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
        showSuccessToast('Product deleted');
        fetchProducts();
      } else {
        const error = await res.json();
        showErrorToast(error, 'Failed to delete product');
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to delete product', error);
      showErrorToast(error, 'Failed to delete product');
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLines();
    fetchUnits();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, lineFilterId]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchProducts();
  }, [search, lineFilterId, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (p) => p.name,
        header: 'Name',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: 'line',
        accessorFn: (p) => p.line?.name ?? '',
        header: 'Product Line',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-on-surface-variant">{row.original.line.name}</span>
            <span className="text-on-surface-variant/70 font-mono text-[11px] tracking-wider uppercase">
              {KIND_LABEL[row.original.line.kind]}
            </span>
          </div>
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
          const low = Number(row.original.currentStock) < Number(row.original.lowerStockLimit);
          return (
            <div className="flex items-center gap-2">
              <span className={low ? 'text-status-error font-mono font-bold' : 'font-mono'}>
                {row.original.currentStock} {row.original.unit.name}
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
        searchPlaceholder="Search products by name or product line..."
        filters={
          <>
            <FilterSelect value={lineFilterId} onChange={(e) => setLineFilterId(e.target.value)}>
              <option value="">All Product Lines</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({KIND_LABEL[l.kind]})
                </option>
              ))}
            </FilterSelect>
            <Button asChild variant="outline">
              <Link href="/product-lines">
                <span className="material-symbols-outlined text-[18px]">category</span>
                Manage product lines
              </Link>
            </Button>
          </>
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

      {/* Add/Edit Product Modal */}
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

              <FormField label="Product Line" required error={errors.lineId}>
                <TextInput
                  className="mb-1.5"
                  placeholder="Filter product lines..."
                  value={lineSearch}
                  onChange={(e) => setLineSearch(e.target.value)}
                />
                <SelectInput
                  value={formData.lineId}
                  invalid={!!errors.lineId}
                  onChange={(e) => handleLineChange(e.target.value)}
                >
                  <option value="" disabled>
                    Select a product line
                  </option>
                  {(['INK', 'MACHINE', 'SPARE_PART'] as Kind[]).map((k) =>
                    linesByKind[k].length > 0 ? (
                      <optgroup key={k} label={KIND_LABEL[k]}>
                        {linesByKind[k].map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null
                  )}
                </SelectInput>
              </FormField>

              <FormField
                label="Product Name"
                required={kind !== 'INK'}
                error={errors.name}
                htmlFor="product-name"
              >
                <TextInput
                  id="product-name"
                  placeholder={kind === 'INK' ? 'Auto-generated from line, colour & pack size' : 'e.g. UV Printer XL-1000'}
                  value={previewName}
                  readOnly={kind === 'INK'}
                  disabled={kind === 'INK'}
                  invalid={!!errors.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormField>

              {kind === 'INK' && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Pack Size" required error={errors.packSize}>
                    <TextInput
                      placeholder="e.g. 1"
                      type="number"
                      min="0"
                      step="0.001"
                      value={formData.packSize}
                      invalid={!!errors.packSize}
                      onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                    />
                  </FormField>
                  {usesColours && (
                    <FormField label="Colour" required error={errors.colourId}>
                      <SelectInput
                        value={formData.colourId}
                        invalid={!!errors.colourId}
                        onChange={(e) => setFormData({ ...formData, colourId: e.target.value })}
                      >
                        <option value="" disabled>
                          Select a colour
                        </option>
                        {colourOptions.map((c) => (
                          <option key={c.colourId} value={c.colourId}>
                            {c.colour.name}
                          </option>
                        ))}
                      </SelectInput>
                    </FormField>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Base Price (₹)" error={errors.basePrice}>
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
                <FormField label="Unit" required error={errors.unitId}>
                  <SelectInput
                    value={formData.unitId}
                    invalid={!!errors.unitId}
                    disabled={!kind}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                  >
                    <option value="" disabled>
                      {kind ? 'Select a unit' : 'Select a product line first'}
                    </option>
                    {unitsForKind.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
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
