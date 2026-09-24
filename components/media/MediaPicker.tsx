'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Pagination from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

const PAGE_LIMIT = 12;

export interface MediaAsset {
  id: string;
  url: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  altText: string | null;
}

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
}

function isImage(mimeType: string) {
  return mimeType.startsWith('image/');
}

/** Modal for picking an existing media asset or uploading a new one. Used
 * anywhere a form needs to attach an image/video/PDF (e.g. GalleryItemForm). */
export default function MediaPicker({ open, onClose, onSelect }: MediaPickerProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/media?page=${page}&limit=${PAGE_LIMIT}`);
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
  }, [page]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAssets();
    }
  }, [open, fetchAssets]);

  const handleDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/media', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) {
          showErrorToast(data, 'Failed to upload file');
          return;
        }
        showSuccessToast('File uploaded');
        onSelect(data.data);
      } catch (error) {
        console.error('Failed to upload file', error);
        showErrorToast(error, 'Failed to upload file');
      } finally {
        setUploading(false);
      }
    },
    [onSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    multiple: false,
    disabled: uploading,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="bg-surface-container-low border-border flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border">
        <div className="border-border flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="font-heading text-on-surface text-sm font-semibold tracking-tight">
            Select Media
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface rounded-md p-1"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div
            {...getRootProps()}
            className={`mb-5 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-surface-container'
            }`}
          >
            <input {...getInputProps()} />
            <span className="material-symbols-outlined text-on-surface-variant text-[28px]">
              upload
            </span>
            <p className="text-on-surface text-sm font-medium">
              {uploading ? 'Uploading…' : 'Drop a file here, or click to browse'}
            </p>
            <p className="text-on-surface-variant text-xs">Images, video, or PDF — up to 25MB</p>
          </div>

          {loading ? (
            <div className="text-on-surface-variant flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-[24px]">
                progress_activity
              </span>
            </div>
          ) : assets.length === 0 ? (
            <EmptyState
              icon={<span className="material-symbols-outlined text-[32px]">perm_media</span>}
              title="No media yet"
              description="Upload a file above to get started."
            />
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onSelect(asset)}
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
                      <span className="px-1 text-center text-[10px] break-all">
                        {asset.mimeType}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {!loading && pagination.total > 0 && (
          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={PAGE_LIMIT}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
