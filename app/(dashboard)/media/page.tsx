'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Pagination from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { TextInput } from '@/components/ui/form';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

const PAGE_LIMIT = 24;

type MediaAsset = {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  createdAt: string;
};

function isImage(mimeType: string) {
  return mimeType.startsWith('image/');
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [altTextDraft, setAltTextDraft] = useState('');
  const [savingAltText, setSavingAltText] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL('/api/media', window.location.origin);
      if (search) url.searchParams.set('search', search);
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', String(PAGE_LIMIT));
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.data) {
        setAssets(data.data);
        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        });
      }
    } catch (error) {
      console.error('Failed to fetch media assets', error);
      showErrorToast(error, 'Failed to load media library');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAssets();
  }, [search, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      let failures = 0;
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/media', { method: 'POST', body: formData });
          const data = await res.json();
          if (!res.ok) {
            failures += 1;
            showErrorToast(data, `Failed to upload ${file.name}`);
          }
        } catch (error) {
          failures += 1;
          console.error('Failed to upload file', error);
          showErrorToast(error, `Failed to upload ${file.name}`);
        }
      }
      setUploading(false);
      if (failures < files.length) {
        showSuccessToast(
          files.length === 1
            ? 'File uploaded'
            : `${files.length - failures} of ${files.length} files uploaded`
        );
      }
      fetchAssets();
    },
    [fetchAssets]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    disabled: uploading,
  });

  const openDetail = (asset: MediaAsset) => {
    setSelected(asset);
    setAltTextDraft(asset.altText ?? '');
  };

  const handleSaveAltText = async () => {
    if (!selected) return;
    try {
      setSavingAltText(true);
      const res = await fetch(`/api/media/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altText: altTextDraft || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        showErrorToast(data, 'Failed to update alt text');
        return;
      }
      showSuccessToast('Alt text updated');
      setSelected(null);
      fetchAssets();
    } catch (error) {
      console.error('Failed to update alt text', error);
      showErrorToast(error, 'Failed to update alt text');
    } finally {
      setSavingAltText(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (
      !window.confirm(
        'Delete this asset? It will be removed from Cloudinary too. This cannot be undone.'
      )
    ) {
      return;
    }
    try {
      setDeleting(true);
      const res = await fetch(`/api/media/${selected.id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccessToast('Asset deleted');
        setSelected(null);
        fetchAssets();
      } else {
        const error = await res.json();
        showErrorToast(error, 'Failed to delete asset');
      }
    } catch (error) {
      console.error('Failed to delete asset', error);
      showErrorToast(error, 'Failed to delete asset');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-6">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by alt text..."
      />

      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-container'
        }`}
      >
        <input {...getInputProps()} />
        <span className="material-symbols-outlined text-on-surface-variant text-[32px]">
          upload
        </span>
        <p className="text-on-surface text-sm font-medium">
          {uploading ? 'Uploading…' : 'Drop files here, or click to browse'}
        </p>
        <p className="text-on-surface-variant text-xs">Images, video, or PDF — up to 25MB each</p>
      </div>

      {loading ? (
        <div className="text-on-surface-variant flex items-center justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-[28px]">
            progress_activity
          </span>
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={<span className="material-symbols-outlined text-[40px]">perm_media</span>}
          title="No media yet"
          description="Drop a file above to add your first asset."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => openDetail(asset)}
              className="border-border hover:border-primary group relative aspect-square overflow-hidden rounded-lg border bg-black/20"
            >
              {isImage(asset.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.url}
                  alt={asset.altText ?? ''}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-on-surface-variant flex h-full w-full flex-col items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[28px]">
                    {asset.mimeType.startsWith('video/') ? 'movie' : 'description'}
                  </span>
                </div>
              )}
              <span className="absolute right-0 bottom-0 left-0 truncate bg-black/60 px-1.5 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {formatSize(asset.sizeBytes)}
              </span>
            </button>
          ))}
        </div>
      )}

      {!loading && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={PAGE_LIMIT}
          onPageChange={setPage}
        />
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="bg-surface-container-low border-border flex w-full max-w-lg flex-col overflow-hidden rounded-xl border">
            <div className="border-border flex items-center justify-between border-b px-5 py-3.5">
              <h2 className="font-heading text-on-surface text-sm font-semibold tracking-tight">
                Asset Details
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="text-on-surface-variant hover:text-on-surface rounded-md p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-4 p-5">
              {isImage(selected.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.url}
                  alt={selected.altText ?? ''}
                  className="border-border max-h-64 w-full rounded-lg border object-contain"
                />
              ) : (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-sm underline"
                >
                  Open {selected.mimeType}
                </a>
              )}
              <dl className="text-on-surface-variant grid grid-cols-2 gap-2 text-xs">
                <dt>Type</dt>
                <dd className="text-on-surface text-right">{selected.mimeType}</dd>
                <dt>Size</dt>
                <dd className="text-on-surface text-right">{formatSize(selected.sizeBytes)}</dd>
                {selected.width && selected.height && (
                  <>
                    <dt>Dimensions</dt>
                    <dd className="text-on-surface text-right">
                      {selected.width}×{selected.height}
                    </dd>
                  </>
                )}
              </dl>
              <div>
                <label className="text-on-surface-variant mb-1.5 block text-xs font-medium">
                  Alt text
                </label>
                <TextInput
                  value={altTextDraft}
                  onChange={(e) => setAltTextDraft(e.target.value)}
                  placeholder="Describe this asset for accessibility"
                />
              </div>
            </div>
            <div className="border-border flex items-center justify-between border-t px-5 py-3.5">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-status-error text-sm font-medium hover:underline disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={handleSaveAltText}
                disabled={savingAltText}
                className="bg-primary text-primary-foreground hover:bg-primary/80 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {savingAltText ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
