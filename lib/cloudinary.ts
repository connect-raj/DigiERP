import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/** Folder every CMS upload lands in, so they're easy to find/manage from the
 * Cloudinary dashboard independent of anything else on the account. */
const UPLOAD_FOLDER = 'digierp-cms';

export interface UploadedMediaAsset {
  publicId: string;
  /** Cloudinary's own classification ('image' | 'video' | 'raw') — required to
   * delete or transform the asset later via their API. */
  resourceType: string;
  url: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

/**
 * Uploads a file buffer to Cloudinary. `resource_type: 'auto'` lets Cloudinary
 * classify images, videos, and PDFs itself rather than us mapping mimeType by
 * hand — PDFs in particular get treated as images (so they get thumbnails).
 */
export async function uploadMediaAsset(buffer: Buffer): Promise<UploadedMediaAsset> {
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: UPLOAD_FOLDER, resource_type: 'auto' },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve(uploadResult);
      }
    );
    stream.end(buffer);
  });

  return {
    publicId: result.public_id,
    resourceType: result.resource_type,
    url: result.secure_url,
    sizeBytes: result.bytes,
    width: result.width,
    height: result.height,
  };
}

/** Deletes an asset from Cloudinary storage. `resourceType` must match what
 * was recorded at upload time (image/video/raw) — Cloudinary's destroy API is
 * scoped per resource type and silently no-ops on a mismatch. */
export async function deleteMediaAsset(publicId: string, resourceType: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
