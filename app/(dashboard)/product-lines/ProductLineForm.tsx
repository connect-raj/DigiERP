'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FormField, SelectInput, SubmitError, TextInput } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

type Kind = 'INK' | 'MACHINE' | 'SPARE_PART';

type LookupItem = { id: string; name: string };
type LineRoleItem = LookupItem & { usesColours: boolean };

type ProductLineDetail = {
  id: string;
  kind: Kind;
  name: string;
  slug: string;
  brandId: string | null;
  technologyId: string | null;
  formatId: string | null;
  roleId: string | null;
  colourSetId: string | null;
  taxClassId: string;
  invoiceName: string | null;
  aliases: string[];
  isActive: boolean;
  heads: { printheadId: string }[];
};

async function fetchLookup<T>(path: string): Promise<T[]> {
  const res = await fetch(`${path}${path.includes('?') ? '&' : '?'}isActive=true&limit=1000`);
  const data = await res.json();
  return data.data ?? [];
}

export default function ProductLineForm({ lineId }: { lineId?: string }) {
  const router = useRouter();
  const isEdit = !!lineId;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [brands, setBrands] = useState<LookupItem[]>([]);
  const [technologies, setTechnologies] = useState<LookupItem[]>([]);
  const [formats, setFormats] = useState<LookupItem[]>([]);
  const [lineRoles, setLineRoles] = useState<LineRoleItem[]>([]);
  const [colourSets, setColourSets] = useState<LookupItem[]>([]);
  const [printheads, setPrintheads] = useState<LookupItem[]>([]);
  const [taxClasses, setTaxClasses] = useState<LookupItem[]>([]);

  const [kind, setKind] = useState<Kind>('INK');
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [technologyId, setTechnologyId] = useState('');
  const [formatId, setFormatId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [colourSetId, setColourSetId] = useState('');
  const [printheadIds, setPrintheadIds] = useState<string[]>([]);
  const [taxClassId, setTaxClassId] = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [aliasesText, setAliasesText] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [b, t, f, r, cs, p, tc] = await Promise.all([
          fetchLookup<LookupItem>('/api/brands'),
          fetchLookup<LookupItem>('/api/technologies'),
          fetchLookup<LookupItem>('/api/formats'),
          fetchLookup<LineRoleItem>('/api/line-roles'),
          fetchLookup<LookupItem>('/api/colour-sets'),
          fetchLookup<LookupItem>('/api/printheads'),
          fetchLookup<LookupItem>('/api/tax-classes'),
        ]);
        setBrands(b);
        setTechnologies(t);
        setFormats(f);
        setLineRoles(r);
        setColourSets(cs);
        setPrintheads(p);
        setTaxClasses(tc);
      } catch (error) {
        console.error('Failed to load lookup data', error);
      }
    };
    loadLookups();
  }, []);

  useEffect(() => {
    if (!lineId) return;
    const loadLine = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/product-lines/${lineId}`);
        const data = await res.json();
        if (data.data) {
          const line: ProductLineDetail = data.data;
          setKind(line.kind);
          setName(line.name);
          setBrandId(line.brandId ?? '');
          setTechnologyId(line.technologyId ?? '');
          setFormatId(line.formatId ?? '');
          setRoleId(line.roleId ?? '');
          setColourSetId(line.colourSetId ?? '');
          setPrintheadIds(line.heads.map((h) => h.printheadId));
          setTaxClassId(line.taxClassId);
          setInvoiceName(line.invoiceName ?? '');
          setAliasesText((line.aliases ?? []).join(', '));
          setIsActive(line.isActive);
        }
      } catch (error) {
        console.error('Failed to load product line', error);
        setSubmitError('Failed to load product line.');
      } finally {
        setLoading(false);
      }
    };
    loadLine();
  }, [lineId]);

  const selectedRole = useMemo(
    () => lineRoles.find((r) => r.id === roleId),
    [lineRoles, roleId]
  );
  const colourSetRequired = kind === 'INK' && !!selectedRole?.usesColours;

  const togglePrinthead = (id: string) => {
    setPrintheadIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required.';
    if (!taxClassId) next.taxClassId = 'Tax class is required.';
    if (kind === 'INK') {
      if (!technologyId) next.technologyId = 'Technology is required for INK lines.';
      if (!roleId) next.roleId = 'Role is required for INK lines.';
      if (printheadIds.length < 1) next.printheadIds = 'Select at least one printhead.';
      if (colourSetRequired && !colourSetId) {
        next.colourSetId = 'Colour set is required for this role.';
      }
    } else if (kind === 'MACHINE') {
      if (!technologyId) next.technologyId = 'Technology is required for MACHINE lines.';
      if (!formatId) next.formatId = 'Format is required for MACHINE lines.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const aliases = aliasesText
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const payload = {
      kind,
      name,
      brandId: brandId || undefined,
      technologyId: technologyId || undefined,
      formatId: formatId || undefined,
      roleId: roleId || undefined,
      colourSetId: colourSetId || undefined,
      printheadIds,
      taxClassId,
      invoiceName: invoiceName || undefined,
      aliases,
      isActive,
    };

    try {
      setSubmitting(true);
      const url = isEdit ? `/api/product-lines/${lineId}` : '/api/product-lines';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        setSubmitError(result.error?.message ?? 'Failed to save product line.');
        return;
      }
      router.push('/product-lines');
    } catch (error) {
      console.error('Failed to save product line', error);
      setSubmitError('An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
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
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="bg-surface-container border-outline-variant flex h-9 w-9 items-center justify-center rounded-lg border-[0.5px] transition-colors hover:bg-[#252525]"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary">
            {isEdit ? 'Edit Product Line' : 'New Product Line'}
          </h1>
          <p className="text-on-surface-variant text-body-sm mt-0.5">
            {isEdit
              ? 'Update this product line and its attributes.'
              : 'Define a new ink, machine, or spare-part line for the catalogue.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <SubmitError>{submitError}</SubmitError>

        <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-6">
          <h3 className="text-body-lg text-primary mb-4 font-bold">Kind</h3>
          <div className="flex flex-wrap gap-3">
            {(['INK', 'MACHINE', 'SPARE_PART'] as Kind[]).map((k) => (
              <label
                key={k}
                className={`cursor-pointer rounded-lg border-[0.5px] px-4 py-2 text-sm font-medium transition-colors ${
                  kind === k
                    ? 'border-secondary bg-secondary/15 text-secondary'
                    : 'border-outline-variant text-on-surface-variant hover:bg-[#252525]'
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="sr-only"
                />
                {k === 'INK' ? 'Ink' : k === 'MACHINE' ? 'Machine' : 'Spare Part'}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-6">
          <h3 className="text-body-lg text-primary mb-4 font-bold">Basic Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Name" required error={errors.name}>
              <TextInput
                placeholder="e.g. UV Curable Ink - CMYK"
                value={name}
                invalid={!!errors.name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>
            <FormField label="Tax Class" required error={errors.taxClassId}>
              <SelectInput
                value={taxClassId}
                invalid={!!errors.taxClassId}
                onChange={(e) => setTaxClassId(e.target.value)}
              >
                <option value="">Select Tax Class...</option>
                {taxClasses.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.name}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="Brand">
              <SelectInput value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">None</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="Invoice Name">
              <TextInput
                placeholder="Name used on printed invoices (optional)"
                value={invoiceName}
                onChange={(e) => setInvoiceName(e.target.value)}
              />
            </FormField>
            <FormField label="Aliases" className="md:col-span-2">
              <TextInput
                placeholder="Comma-separated alternate names (optional)"
                value={aliasesText}
                onChange={(e) => setAliasesText(e.target.value)}
              />
            </FormField>
            {isEdit && (
              <FormField label="Status">
                <SelectInput
                  value={isActive.toString()}
                  onChange={(e) => setIsActive(e.target.value === 'true')}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </SelectInput>
              </FormField>
            )}
          </div>
        </div>

        {kind === 'INK' && (
          <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-6">
            <h3 className="text-body-lg text-primary mb-4 font-bold">Ink Attributes</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Technology" required error={errors.technologyId}>
                <SelectInput
                  value={technologyId}
                  invalid={!!errors.technologyId}
                  onChange={(e) => setTechnologyId(e.target.value)}
                >
                  <option value="">Select Technology...</option>
                  {technologies.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField label="Role" required error={errors.roleId}>
                <SelectInput
                  value={roleId}
                  invalid={!!errors.roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                >
                  <option value="">Select Role...</option>
                  {lineRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField
                label="Colour Set"
                required={colourSetRequired}
                error={errors.colourSetId}
                className="md:col-span-2"
              >
                <SelectInput
                  value={colourSetId}
                  invalid={!!errors.colourSetId}
                  onChange={(e) => setColourSetId(e.target.value)}
                >
                  <option value="">{colourSetRequired ? 'Select Colour Set...' : 'None'}</option>
                  {colourSets.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.name}
                    </option>
                  ))}
                </SelectInput>
                {colourSetRequired && (
                  <span className="text-on-surface-variant/70 text-[11px]">
                    Required because the selected role uses colours.
                  </span>
                )}
              </FormField>
              <FormField
                label="Printheads"
                required
                error={errors.printheadIds}
                className="md:col-span-2"
              >
                <div className="flex flex-wrap gap-2">
                  {printheads.map((p) => (
                    <label
                      key={p.id}
                      className={`cursor-pointer rounded-lg border-[0.5px] px-3 py-1.5 text-sm transition-colors ${
                        printheadIds.includes(p.id)
                          ? 'border-secondary bg-secondary/15 text-secondary'
                          : 'border-outline-variant text-on-surface-variant hover:bg-[#252525]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={printheadIds.includes(p.id)}
                        onChange={() => togglePrinthead(p.id)}
                        className="sr-only"
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </FormField>
            </div>
          </div>
        )}

        {kind === 'MACHINE' && (
          <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-6">
            <h3 className="text-body-lg text-primary mb-4 font-bold">Machine Attributes</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Technology" required error={errors.technologyId}>
                <SelectInput
                  value={technologyId}
                  invalid={!!errors.technologyId}
                  onChange={(e) => setTechnologyId(e.target.value)}
                >
                  <option value="">Select Technology...</option>
                  {technologies.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField label="Format" required error={errors.formatId}>
                <SelectInput
                  value={formatId}
                  invalid={!!errors.formatId}
                  onChange={(e) => setFormatId(e.target.value)}
                >
                  <option value="">Select Format...</option>
                  {formats.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField
                label="Printheads"
                className="md:col-span-2"
              >
                <div className="flex flex-wrap gap-2">
                  {printheads.map((p) => (
                    <label
                      key={p.id}
                      className={`cursor-pointer rounded-lg border-[0.5px] px-3 py-1.5 text-sm transition-colors ${
                        printheadIds.includes(p.id)
                          ? 'border-secondary bg-secondary/15 text-secondary'
                          : 'border-outline-variant text-on-surface-variant hover:bg-[#252525]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={printheadIds.includes(p.id)}
                        onChange={() => togglePrinthead(p.id)}
                        className="sr-only"
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
                <span className="text-on-surface-variant/70 text-[11px]">
                  Optional for machine lines.
                </span>
              </FormField>
            </div>
          </div>
        )}

        <div className="fixed right-0 bottom-0 left-[260px] z-40 flex items-center justify-end gap-4 border-t border-[#2e2e2e] bg-[#1e1e1e] px-10 py-4 shadow-2xl">
          <Link
            href="/product-lines"
            className="border-outline-variant text-on-surface text-body-md rounded-lg border-[0.5px] px-5 py-2 font-semibold transition-colors hover:bg-[#252525]"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  progress_activity
                </span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                {isEdit ? 'Update Product Line' : 'Create Product Line'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
