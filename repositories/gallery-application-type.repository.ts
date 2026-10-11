import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ConflictError } from '@/lib/errors';
import {
  CreateGalleryApplicationTypeInput,
  UpdateGalleryApplicationTypeInput,
} from '@/validations/gallery-application-type';

export class GalleryApplicationTypeRepository {
  async findAll(params: { search?: string; skip?: number; take?: number }) {
    const { search, skip, take } = params;
    const where: Prisma.GalleryApplicationTypeWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      prisma.galleryApplicationType.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
        include: { _count: { select: { galleryItems: true } } },
      }),
      prisma.galleryApplicationType.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.galleryApplicationType.findUnique({ where: { id } });
  }

  async create(data: CreateGalleryApplicationTypeInput) {
    return prisma.galleryApplicationType.create({ data });
  }

  async update(id: string, data: UpdateGalleryApplicationTypeInput) {
    return prisma.galleryApplicationType.update({ where: { id }, data });
  }

  /** DB-level FK on GalleryItem.applicationTypeId is ON DELETE RESTRICT, so a
   * referenced type can never actually be deleted — this check exists purely
   * to surface a friendly 409 instead of a raw Postgres FK-violation 500. */
  async delete(id: string) {
    const type = await prisma.galleryApplicationType.findUnique({
      where: { id },
      include: { _count: { select: { galleryItems: true } } },
    });
    if (!type) return;

    if (type._count.galleryItems > 0) {
      throw new ConflictError(
        `Cannot delete '${type.name}': it is in use by ${type._count.galleryItems} gallery item(s).`
      );
    }

    await prisma.galleryApplicationType.delete({ where: { id } });
  }
}

export const galleryApplicationTypeRepository = new GalleryApplicationTypeRepository();
