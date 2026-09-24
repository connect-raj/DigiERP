import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { CreateGalleryItemInput, UpdateGalleryItemInput } from '@/validations/gallery-item';

const INCLUDE = {
  applicationType: true,
  image: true,
  relatedProductLine: { select: { id: true, name: true } },
} as const;

export interface GalleryItemFilters {
  search?: string;
  applicationTypeId?: string;
  relatedProductLineId?: string;
  isPublished?: boolean;
  skip?: number;
  take?: number;
}

export class GalleryItemRepository {
  async findAll(filters: GalleryItemFilters) {
    const { search, applicationTypeId, relatedProductLineId, isPublished, skip, take } = filters;
    const where: Prisma.GalleryItemWhereInput = {
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(applicationTypeId && { applicationTypeId }),
      ...(relatedProductLineId && { relatedProductLineId }),
      ...(isPublished !== undefined && { isPublished }),
    };

    const [data, total] = await Promise.all([
      prisma.galleryItem.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      prisma.galleryItem.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.galleryItem.findUnique({ where: { id }, include: INCLUDE });
  }

  async create(data: CreateGalleryItemInput) {
    return prisma.galleryItem.create({ data, include: INCLUDE });
  }

  async update(id: string, data: UpdateGalleryItemInput) {
    return prisma.galleryItem.update({ where: { id }, data, include: INCLUDE });
  }

  async delete(id: string) {
    await prisma.galleryItem.delete({ where: { id } });
  }
}

export const galleryItemRepository = new GalleryItemRepository();
