import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ConflictError } from '@/lib/errors';
import { UpdateMediaAssetInput } from '@/validations/media-asset';
import { UploadedMediaAsset } from '@/lib/cloudinary';

export interface MediaAssetCreateData extends UploadedMediaAsset {
  mimeType: string;
  altText?: string | null;
}

export class MediaAssetRepository {
  async findAll(params: { search?: string; skip?: number; take?: number }) {
    const { search, skip, take } = params;
    const where: Prisma.MediaAssetWhereInput = {
      ...(search && { altText: { contains: search, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { _count: { select: { galleryItems: true } } },
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.mediaAsset.findUnique({ where: { id } });
  }

  async create(data: MediaAssetCreateData) {
    return prisma.mediaAsset.create({
      data: {
        publicId: data.publicId,
        resourceType: data.resourceType,
        url: data.url,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        width: data.width,
        height: data.height,
        altText: data.altText,
      },
    });
  }

  async update(id: string, data: UpdateMediaAssetInput) {
    return prisma.mediaAsset.update({ where: { id }, data });
  }

  /** DB-level FK on GalleryItem.imageId is ON DELETE RESTRICT, so an in-use
   * asset can never actually be deleted here — this check surfaces a
   * friendly 409 instead of a raw Postgres FK-violation 500. Returns the
   * deleted row (so the caller can clean up the Cloudinary side) or null if
   * nothing was deleted. */
  async delete(id: string) {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      include: { _count: { select: { galleryItems: true } } },
    });
    if (!asset) return null;

    if (asset._count.galleryItems > 0) {
      throw new ConflictError(
        `Cannot delete this asset: it is in use by ${asset._count.galleryItems} gallery item(s).`
      );
    }

    await prisma.mediaAsset.delete({ where: { id } });
    return asset;
  }
}

export const mediaAssetRepository = new MediaAssetRepository();
