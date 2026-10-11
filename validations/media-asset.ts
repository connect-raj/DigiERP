import { z } from 'zod';

/** MIME types accepted for upload — images, video, and PDFs (spec sheets /
 * brochures may live here even without a dedicated marketing-content module
 * yet). Anything else is rejected before it ever reaches Cloudinary. */
export const ALLOWED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
] as const;

export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

export function isAllowedMediaMimeType(mimeType: string): mimeType is AllowedMediaMimeType {
  return (ALLOWED_MEDIA_MIME_TYPES as readonly string[]).includes(mimeType);
}

/** Soft pre-upload size guard (bytes), independent of whatever limit
 * Cloudinary enforces on the account's own plan (which will reject an
 * oversized file regardless) — this just fails fast with a friendly error
 * instead of spending an upload round-trip first. */
export const MAX_MEDIA_ASSET_BYTES = 25 * 1024 * 1024; // 25 MB

export const updateMediaAssetSchema = z.object({
  altText: z.string().max(500).nullable().optional(),
});

export type UpdateMediaAssetInput = z.infer<typeof updateMediaAssetSchema>;
