'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TextInput } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

type ApplicationType = {
  id: string;
  name: string;
  _count?: { galleryItems: number };
};

export default function GalleryApplicationTypesPage() {
  const [types, setTypes] = useState<ApplicationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gallery-application-types?limit=200');
      const data = await res.json();
      if (data.data) setTypes(data.data);
    } catch (error) {
      console.error('Failed to fetch application types', error);
      showErrorToast(error, 'Failed to load application types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTypes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/gallery-application-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error?.message ?? 'Failed to create type');
        showErrorToast(data, 'Failed to create type');
        return;
      }
      setName('');
      showSuccessToast('Application type created');
      fetchTypes();
    } catch (error) {
      console.error('Failed to create application type', error);
      setFormError('An unexpected error occurred.');
      showErrorToast(error, 'Failed to create application type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (type: ApplicationType) => {
    if (!window.confirm(`Delete the application type "${type.name}"?`)) return;
    try {
      setDeletingId(type.id);
      const res = await fetch(`/api/gallery-application-types/${type.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        showErrorToast(data, 'Failed to delete type');
        return;
      }
      showSuccessToast('Application type deleted');
      fetchTypes();
    } catch (error) {
      console.error('Failed to delete application type', error);
      showErrorToast(error, 'Failed to delete application type');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/gallery"
          className="bg-surface-container border-outline-variant flex h-9 w-9 items-center justify-center rounded-lg border-[0.5px] transition-colors hover:bg-[#252525]"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Gallery Application Types
          </h1>
          <p className="text-on-surface-variant mt-1 text-[13px]">
            Categories used to group gallery items (e.g. Signage, Textile, Vehicle Wraps).
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="border-border bg-surface-container-low mb-8 max-w-lg rounded-xl border p-5"
      >
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-on-surface-variant mb-1.5 block text-xs font-medium">
              Name
            </label>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Signage"
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add Type'}
          </Button>
        </div>
        {formError && <p className="text-status-error mt-3 text-xs">{formError}</p>}
      </form>

      {!loading && types.length === 0 ? (
        <EmptyState
          icon={<span className="material-symbols-outlined text-[32px]">sell</span>}
          title="No application types yet"
          description="Add one above to start categorizing gallery items."
        />
      ) : (
        <div className="border-border bg-surface-container-low max-w-lg overflow-hidden rounded-xl border">
          <table className="w-full border-collapse text-left">
            <tbody className="divide-border divide-y">
              {types.map((type) => (
                <tr key={type.id}>
                  <td className="px-5 py-3 text-sm font-medium">{type.name}</td>
                  <td className="text-on-surface-variant px-5 py-3 text-right text-xs">
                    {type._count?.galleryItems ?? 0} item(s)
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(type)}
                      disabled={deletingId === type.id}
                      className="text-on-surface-variant hover:text-status-error text-xs underline disabled:opacity-50"
                    >
                      {deletingId === type.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
