'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FormField, SelectInput, SubmitError, TextInput } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import MediaPicker, { MediaAsset } from '@/components/media/MediaPicker';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

type ApplicationType = { id: string; name: string };
type ProductLine = { id: string; name: string };

type GalleryItemDetail = {
  id: string;
  title: string;
  applicationTypeId: string;
  imageId: string;
  relatedProductLineId: string | null;
  displayOrder: number;
  isPublished: boolean;
  image: MediaAsset;
};

function isImage(mimeType: string) {
  return mimeType.startsWith('image/');
}

export default function GalleryItemForm({ itemId }: { itemId?: string }) {
  const router = useRouter();
  const isEdit = !!itemId;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [applicationTypes, setApplicationTypes] = useState<ApplicationType[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);

  const [title, setTitle] = useState('');
  const [applicationTypeId, setApplicationTypeId] = useState('');
  const [relatedProductLineId, setRelatedProductLineId] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [image, setImage] = useState<MediaAsset | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [typesRes, linesRes] = await Promise.all([
          fetch('/api/gallery-application-types?limit=200'),
          fetch('/api/product-lines?isActive=true&limit=1000'),
        ]);
        const [typesData, linesData] = await Promise.all([typesRes.json(), linesRes.json()]);
        setApplicationTypes(typesData.data ?? []);
        setProductLines(linesData.data ?? []);
      } catch (error) {
        console.error('Failed to load lookup data', error);
        showErrorToast(error, 'Failed to load lookup data');
      }
    };
    loadLookups();
  }, []);

  useEffect(() => {
    if (!itemId) return;
    const loadItem = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/gallery/${itemId}`);
        const data = await res.json();
        if (data.data) {
          const item: GalleryItemDetail = data.data;
          setTitle(item.title);
          setApplicationTypeId(item.applicationTypeId);
          setRelatedProductLineId(item.relatedProductLineId ?? '');
          setDisplayOrder(item.displayOrder);
          setIsPublished(item.isPublished);
          setImage(item.image);
        }
      } catch (error) {
        console.error('Failed to load gallery item', error);
        setSubmitError('Failed to load gallery item.');
        showErrorToast(error, 'Failed to load gallery item');
      } finally {
        setLoading(false);
      }
    };
    loadItem();
  }, [itemId]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Title is required.';
    if (!applicationTypeId) next.applicationTypeId = 'Application type is required.';
    if (!image) next.image = 'An image is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const payload = {
      title,
      applicationTypeId,
      imageId: image!.id,
      relatedProductLineId: relatedProductLineId || null,
      displayOrder,
      isPublished,
    };

    try {
      setSubmitting(true);
      const url = isEdit ? `/api/gallery/${itemId}` : '/api/gallery';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        setSubmitError(result.error?.message ?? 'Failed to save gallery item.');
        showErrorToast(result, 'Failed to save gallery item');
        return;
      }
      showSuccessToast(isEdit ? 'Gallery item updated' : 'Gallery item created');
      router.push('/gallery');
    } catch (error) {
      console.error('Failed to save gallery item', error);
      setSubmitError('An unexpected error occurred during submission.');
      showErrorToast(error, 'Failed to save gallery item');
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
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {isEdit ? 'Edit Gallery Item' : 'New Gallery Item'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {submitError && <SubmitError>{submitError}</SubmitError>}

        <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-6">
          <h3 className="text-body-lg text-primary mb-4 font-bold">Image</h3>
          <div className="flex items-start gap-4">
            <div className="border-border h-28 w-28 shrink-0 overflow-hidden rounded-lg border bg-black/20">
              {image && isImage(image.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.url}
                  alt={image.altText ?? ''}
                  className="h-full w-full object-cover"
                />
              ) : image ? (
                <div className="text-on-surface-variant flex h-full w-full items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">description</span>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
                {image ? 'Change Image' : 'Select Image'}
              </Button>
              {errors.image && <p className="text-status-error text-xs">{errors.image}</p>}
            </div>
          </div>
        </div>

        <div className="bg-surface-container border-outline-variant rounded-xl border-[0.5px] p-6">
          <h3 className="text-body-lg text-primary mb-4 font-bold">Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Title" required error={errors.title} className="md:col-span-2">
              <TextInput
                value={title}
                invalid={!!errors.title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Storefront signage installation"
              />
            </FormField>
            <FormField label="Application Type" required error={errors.applicationTypeId}>
              <SelectInput
                value={applicationTypeId}
                invalid={!!errors.applicationTypeId}
                onChange={(e) => setApplicationTypeId(e.target.value)}
              >
                <option value="">Select Type...</option>
                {applicationTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="Related Product Line">
              <SelectInput
                value={relatedProductLineId}
                onChange={(e) => setRelatedProductLineId(e.target.value)}
              >
                <option value="">None</option>
                {productLines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="Display Order">
              <TextInput
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)}
              />
            </FormField>
            <FormField label="Status">
              <label className="border-border flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                Published (visible on the public site)
              </label>
            </FormField>
          </div>
        </div>

        <div className="fixed right-0 bottom-0 left-[260px] z-40 flex items-center justify-end gap-4 border-t border-[#2e2e2e] bg-[#1e1e1e] px-10 py-4 shadow-2xl">
          <Link
            href="/gallery"
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
                {isEdit ? 'Update Gallery Item' : 'Create Gallery Item'}
              </>
            )}
          </Button>
        </div>
      </form>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(asset) => {
          setImage(asset);
          setPickerOpen(false);
          setErrors((prev) => ({ ...prev, image: '' }));
        }}
      />
    </div>
  );
}
