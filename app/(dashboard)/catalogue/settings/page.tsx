'use client';

import React, { useEffect, useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

const PAGE_LIMIT = 20;

const TABS = [
  { key: 'brands', label: 'Brands', apiPath: '/api/brands', extra: 'none' },
  { key: 'technologies', label: 'Technologies', apiPath: '/api/technologies', extra: 'none' },
  { key: 'formats', label: 'Formats', apiPath: '/api/formats', extra: 'none' },
  { key: 'line-roles', label: 'Roles', apiPath: '/api/line-roles', extra: 'usesColours' },
  { key: 'colours', label: 'Colours', apiPath: '/api/colours', extra: 'none' },
  { key: 'colour-sets', label: 'Colour Sets', apiPath: '/api/colour-sets', extra: 'colourIds' },
  { key: 'units', label: 'Units', apiPath: '/api/units', extra: 'appliesTo' },
  { key: 'tax-classes', label: 'Tax Classes', apiPath: '/api/tax-classes', extra: 'tax' },
  { key: 'printheads', label: 'Printheads', apiPath: '/api/printheads', extra: 'dropSizePl' },
] as const;

type TabKey = (typeof TABS)[number]['key'];
type ExtraKind = (typeof TABS)[number]['extra'];

const PRODUCT_KINDS = ['INK', 'MACHINE', 'SPARE_PART'] as const;

interface ColourRef {
  id: string;
  name: string;
}

interface LookupItem {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  usesColours?: boolean;
  appliesTo?: string[];
  hsnCode?: string | null;
  gstRate?: number | string;
  dropSizePl?: number | string | null;
  colours?: { colour: ColourRef }[];
}

interface FormState {
  name: string;
  isActive: boolean;
  sortOrder: string;
  usesColours: boolean;
  appliesTo: string[];
  hsnCode: string;
  gstRate: string;
  dropSizePl: string;
  colourIds: string[];
}

const EMPTY_FORM: FormState = {
  name: '',
  isActive: true,
  sortOrder: '0',
  usesColours: false,
  appliesTo: [],
  hsnCode: '',
  gstRate: '',
  dropSizePl: '',
  colourIds: [],
};

function buildPayload(extra: ExtraKind, form: FormState): Record<string, unknown> {
  const base: Record<string, unknown> = {
    name: form.name,
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder) || 0,
  };

  switch (extra) {
    case 'usesColours':
      return { ...base, usesColours: form.usesColours };
    case 'appliesTo':
      return { ...base, appliesTo: form.appliesTo };
    case 'tax':
      return {
        ...base,
        hsnCode: form.hsnCode || undefined,
        gstRate: form.gstRate === '' ? undefined : Number(form.gstRate),
      };
    case 'dropSizePl':
      return { ...base, dropSizePl: form.dropSizePl === '' ? undefined : Number(form.dropSizePl) };
    case 'colourIds':
      return { ...base, colourIds: form.colourIds };
    default:
      return base;
  }
}

function extraColumnLabels(extra: ExtraKind): string[] {
  switch (extra) {
    case 'usesColours':
      return ['Uses Colours'];
    case 'appliesTo':
      return ['Applies To'];
    case 'tax':
      return ['HSN Code', 'GST Rate'];
    case 'dropSizePl':
      return ['Drop Size (pl)'];
    case 'colourIds':
      return ['Colours'];
    default:
      return [];
  }
}

function renderExtraCells(extra: ExtraKind, item: LookupItem): React.ReactNode[] {
  switch (extra) {
    case 'usesColours':
      return [item.usesColours ? 'Yes' : 'No'];
    case 'appliesTo':
      return [(item.appliesTo ?? []).join(', ') || '—'];
    case 'tax':
      return [
        item.hsnCode || '—',
        item.gstRate !== undefined && item.gstRate !== null ? `${item.gstRate}%` : '—',
      ];
    case 'dropSizePl':
      return [item.dropSizePl !== undefined && item.dropSizePl !== null ? String(item.dropSizePl) : '—'];
    case 'colourIds':
      return [(item.colours ?? []).map((c) => c.colour.name).join(', ') || '—'];
    default:
      return [];
  }
}

export default function CatalogueSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('brands');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [allColours, setAllColours] = useState<ColourRef[]>([]);
  const [colourToAdd, setColourToAdd] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const tab = TABS.find((t) => t.key === activeTab)!;

  const fetchItems = async () => {
    try {
      setLoading(true);
      const url = new URL(tab.apiPath, window.location.origin);
      if (search) url.searchParams.append('search', search);
      url.searchParams.append('page', String(page));
      url.searchParams.append('limit', String(PAGE_LIMIT));

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setItems(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
      }
    } catch (error) {
      console.error(`Failed to fetch ${tab.label}`, error);
      showErrorToast(error, `Failed to load ${tab.label.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllColours = async () => {
    try {
      const res = await fetch('/api/colours?limit=1000');
      const data = await res.json();
      if (data.data) setAllColours(data.data);
    } catch (error) {
      console.error('Failed to fetch colours', error);
      showErrorToast(error, 'Failed to load colours');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, activeTab]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchItems();
  }, [activeTab, search, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // eslint-disable-next-line
    fetchAllColours();
  }, []);

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSubmitError(null);
    setColourToAdd('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: LookupItem) => {
    setForm({
      name: item.name,
      isActive: item.isActive,
      sortOrder: String(item.sortOrder ?? 0),
      usesColours: item.usesColours ?? false,
      appliesTo: item.appliesTo ?? [],
      hsnCode: item.hsnCode ?? '',
      gstRate: item.gstRate !== undefined && item.gstRate !== null ? String(item.gstRate) : '',
      dropSizePl:
        item.dropSizePl !== undefined && item.dropSizePl !== null ? String(item.dropSizePl) : '',
      colourIds: (item.colours ?? []).map((c) => c.colour.id),
    });
    setEditingId(item.id);
    setSubmitError(null);
    setColourToAdd('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      setIsSubmitting(true);
      const url = editingId ? `${tab.apiPath}/${editingId}` : tab.apiPath;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(tab.extra, form)),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setForm(EMPTY_FORM);
        const wasEditing = !!editingId;
        setEditingId(null);
        showSuccessToast(`${tab.label.replace(/s$/, '')} ${wasEditing ? 'updated' : 'created'}`);
        fetchItems();
        if (activeTab === 'colours') fetchAllColours();
      } else {
        const error = await res.json();
        setSubmitError(error.error?.message ?? error.message ?? 'Failed to save.');
        showErrorToast(error, `Failed to ${editingId ? 'update' : 'create'} ${tab.label.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Failed to ${editingId ? 'update' : 'create'} ${tab.label}`, error);
      setSubmitError(`Failed to ${editingId ? 'update' : 'create'}.`);
      showErrorToast(error, `Failed to ${editingId ? 'update' : 'create'} ${tab.label.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: LookupItem) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${item.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${tab.apiPath}/${item.id}`, { method: 'DELETE' });

      if (res.ok) {
        showSuccessToast(`${tab.label.replace(/s$/, '')} deleted`);
        fetchItems();
      } else {
        const error = await res.json();
        showErrorToast(error, 'Failed to delete');
        setLoading(false);
      }
    } catch (error) {
      console.error(`Failed to delete`, error);
      showErrorToast(error, 'Failed to delete');
      setLoading(false);
    }
  };

  const toggleAppliesTo = (kind: string) => {
    setForm((prev) => ({
      ...prev,
      appliesTo: prev.appliesTo.includes(kind)
        ? prev.appliesTo.filter((k) => k !== kind)
        : [...prev.appliesTo, kind],
    }));
  };

  const addColour = () => {
    if (!colourToAdd || form.colourIds.includes(colourToAdd)) return;
    setForm((prev) => ({ ...prev, colourIds: [...prev.colourIds, colourToAdd] }));
    setColourToAdd('');
  };

  const removeColour = (id: string) => {
    setForm((prev) => ({ ...prev, colourIds: prev.colourIds.filter((c) => c !== id) }));
  };

  const moveColour = (index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const next = [...prev.colourIds];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, colourIds: next };
    });
  };

  const colourNameById = new Map(allColours.map((c) => [c.id, c.name]));
  const extraLabels = extraColumnLabels(tab.extra);
  const colSpan = 4 + extraLabels.length;

  return (
    <div className="flex min-h-full flex-col gap-8">
      {/* Header Section */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-display text-on-surface">Catalogue Settings</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Manage the shared lookup tables that drive product lines and products.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary text-on-primary font-body-md hover:bg-opacity-90 flex items-center gap-2 rounded-lg px-6 py-2.5 font-bold transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add {tab.label.replace(/s$/, '')}
        </button>
      </div>

      {/* Tab Strip */}
      <div className="flex flex-wrap gap-2 border-b-[0.5px] border-[#333] pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`font-body-md rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
              activeTab === t.key
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-[#252525]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex h-[52px] items-center rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] p-1 transition-colors focus-within:border-[#555] md:w-1/2">
        <span className="material-symbols-outlined px-3 text-[#8e9192]">search</span>
        <input
          className="text-on-surface font-body-md h-full w-full border-none bg-transparent p-0 text-[13px] placeholder:text-[#8e9192] focus:ring-0"
          placeholder={`Search ${tab.label.toLowerCase()} by name...`}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="flex flex-col overflow-hidden rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-[0.5px] border-[#333] bg-[#222]">
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 tracking-wider uppercase">
                Name
              </th>
              {extraLabels.map((label) => (
                <th
                  key={label}
                  className="font-label-caps text-label-caps text-outline px-6 py-4 tracking-wider uppercase"
                >
                  {label}
                </th>
              ))}
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 text-right tracking-wider uppercase">
                Sort Order
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 text-right tracking-wider uppercase">
                Status
              </th>
              <th className="font-label-caps text-label-caps text-outline px-6 py-4 text-right tracking-wider uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-[0.5px] divide-[#333]">
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="text-on-surface-variant px-6 py-8 text-center">
                  Loading {tab.label.toLowerCase()}...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="text-on-surface-variant px-6 py-8 text-center">
                  No {tab.label.toLowerCase()} found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="group transition-colors hover:bg-[#252525]">
                  <td className="text-primary px-6 py-4 font-semibold">{item.name}</td>
                  {renderExtraCells(tab.extra, item).map((cell, idx) => (
                    <td
                      key={idx}
                      className="font-data-tabular text-on-surface-variant px-6 py-4"
                    >
                      {cell}
                    </td>
                  ))}
                  <td className="font-data-tabular text-on-surface px-6 py-4 text-right">
                    {item.sortOrder}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`rounded px-2 py-1 text-[12px] ${
                        item.isActive
                          ? 'bg-secondary/15 text-secondary'
                          : 'bg-error/15 text-error'
                      }`}
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-outline hover:text-primary rounded-md p-1.5 transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border-[0.5px] border-[#444] bg-[#1c1c1c] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-primary">
                {editingId ? `Edit ${tab.label.replace(/s$/, '')}` : `Add New ${tab.label.replace(/s$/, '')}`}
              </h3>
              <button
                className="material-symbols-outlined text-outline hover:text-primary"
                onClick={() => setIsModalOpen(false)}
              >
                close
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {submitError && (
                <div className="bg-error/10 text-error rounded-lg border-[0.5px] border-error/30 p-3 text-[13px]">
                  {submitError}
                </div>
              )}

              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                  Name
                </label>
                <input
                  className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                  placeholder={`e.g. ${tab.label.replace(/s$/, '')} name`}
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {tab.extra === 'usesColours' && (
                <label className="flex items-center gap-2 text-[13px] text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={form.usesColours}
                    onChange={(e) => setForm({ ...form, usesColours: e.target.checked })}
                  />
                  Uses colours
                </label>
              )}

              {tab.extra === 'appliesTo' && (
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    Applies To
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {PRODUCT_KINDS.map((kind) => (
                      <label
                        key={kind}
                        className="flex items-center gap-2 text-[13px] text-on-surface-variant"
                      >
                        <input
                          type="checkbox"
                          checked={form.appliesTo.includes(kind)}
                          onChange={() => toggleAppliesTo(kind)}
                        />
                        {kind}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {tab.extra === 'tax' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                      HSN Code
                    </label>
                    <input
                      className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                      type="text"
                      value={form.hsnCode}
                      onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                      GST Rate (%)
                    </label>
                    <input
                      className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.gstRate}
                      onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              {tab.extra === 'dropSizePl' && (
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    Drop Size (pl)
                  </label>
                  <input
                    className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    type="number"
                    step="0.01"
                    value={form.dropSizePl}
                    onChange={(e) => setForm({ ...form, dropSizePl: e.target.value })}
                  />
                </div>
              )}

              {tab.extra === 'colourIds' && (
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    Colours (ordered)
                  </label>
                  <div className="mb-2 flex gap-2">
                    <select
                      className="text-body-md text-primary w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-2 outline-none"
                      value={colourToAdd}
                      onChange={(e) => setColourToAdd(e.target.value)}
                    >
                      <option value="">Select a colour to add...</option>
                      {allColours
                        .filter((c) => !form.colourIds.includes(c.id))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={addColour}
                      className="text-primary rounded-lg border-[0.5px] border-[#444] px-3 py-2 text-[13px] font-semibold hover:bg-[#252525]"
                    >
                      Add
                    </button>
                  </div>
                  <ul className="divide-y-[0.5px] divide-[#333] rounded-lg border-[0.5px] border-[#333]">
                    {form.colourIds.length === 0 && (
                      <li className="text-on-surface-variant px-3 py-2 text-[13px]">
                        No colours selected.
                      </li>
                    )}
                    {form.colourIds.map((id, index) => (
                      <li key={id} className="flex items-center justify-between px-3 py-2 text-[13px]">
                        <span className="text-on-surface">
                          {index + 1}. {colourNameById.get(id) ?? id}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveColour(index, -1)}
                            disabled={index === 0}
                            className="text-outline hover:text-primary disabled:opacity-30"
                            title="Move up"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_upward
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveColour(index, 1)}
                            disabled={index === form.colourIds.length - 1}
                            className="text-outline hover:text-primary disabled:opacity-30"
                            title="Move down"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_downward
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeColour(id)}
                            className="text-outline hover:text-error"
                            title="Remove"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    Sort Order
                  </label>
                  <input
                    className="text-body-md text-primary focus:border-secondary-container w-full rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block uppercase">
                    Status
                  </label>
                  <select
                    className="text-body-md text-primary focus:border-secondary-container w-full appearance-none rounded-lg border-[0.5px] border-[#333] bg-[#141313] p-3 outline-none"
                    value={form.isActive.toString()}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
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
