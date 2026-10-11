import { mediaAssetRepository, MediaAssetCreateData } from '@/repositories/media-asset.repository';
import {
  UpdateMediaAssetInput,
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_MEDIA_ASSET_BYTES,
  isAllowedMediaMimeType,
} from '@/validations/media-asset';
import { NotFoundError, BadRequestError } from '@/lib/errors';
import { uploadMediaAsset, deleteMediaAsset } from '@/lib/cloudinary';

export class MediaAssetService {
  async getAll(filters: { search?: string; skip?: number; take?: number }) {
    return mediaAssetRepository.findAll(filters);
  }

  async getById(id: string) {
    const asset = await mediaAssetRepository.findById(id);
    if (!asset) {
      throw new NotFoundError(`Media asset with id '${id}' not found`);
    }
    return asset;
  }

  /**
   * Validates the file, uploads it to Cloudinary, then persists the row. If
   * persistence fails after a successful upload, the Cloudinary asset is
   * cleaned up rather than left orphaned (best-effort — a cleanup failure is
   * swallowed so it doesn't mask the original error).
   */
  async upload(file: File, altText?: string | null) {
    if (!isAllowedMediaMimeType(file.type)) {
      throw new BadRequestError(
        `Unsupported file type '${file.type}'. Allowed: ${ALLOWED_MEDIA_MIME_TYPES.join(', ')}`
      );
    }
    if (file.size > MAX_MEDIA_ASSET_BYTES) {
      throw new BadRequestError(
        `File too large (${Math.round(file.size / 1024 / 1024)}MB). Max ${
          MAX_MEDIA_ASSET_BYTES / 1024 / 1024
        }MB.`
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadMediaAsset(buffer);

    const data: MediaAssetCreateData = {
      ...uploaded,
      mimeType: file.type,
      altText: altText ?? null,
    };

    try {
      return await mediaAssetRepository.create(data);
    } catch (error) {
      await deleteMediaAsset(uploaded.publicId, uploaded.resourceType).catch(() => undefined);
      throw error;
    }
  }

  async update(id: string, data: UpdateMediaAssetInput) {
    await this.getById(id);
    return mediaAssetRepository.update(id, data);
  }

  async delete(id: string) {
    await this.getById(id);
    const deleted = await mediaAssetRepository.delete(id);
    if (deleted) {
      await deleteMediaAsset(deleted.publicId, deleted.resourceType);
    }
  }
}

export const mediaAssetService = new MediaAssetService();
