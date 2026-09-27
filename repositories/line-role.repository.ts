import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ConflictError } from '@/lib/errors';
import { CreateLineRoleInput, UpdateLineRoleInput } from '@/validations/line-role';

export class LineRoleRepository {
  async findAll(params: { search?: string; isActive?: boolean; skip?: number; take?: number }) {
    const { search, isActive, skip, take } = params;
    const where: Prisma.LineRoleWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      prisma.lineRole.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prisma.lineRole.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.lineRole.findUnique({ where: { id } });
  }

  async create(data: CreateLineRoleInput) {
    return prisma.lineRole.create({ data });
  }

  async update(id: string, data: UpdateLineRoleInput) {
    return prisma.lineRole.update({ where: { id }, data });
  }

  async delete(id: string) {
    const lineRole = await prisma.lineRole.findUnique({
      where: { id },
      include: { _count: { select: { productLines: true } } },
    });
    if (!lineRole) return;

    if (lineRole._count.productLines > 0) {
      throw new ConflictError(
        `Cannot delete '${lineRole.name}': it is in use by ${lineRole._count.productLines} product line(s) — deactivate it instead.`
      );
    }

    await prisma.lineRole.delete({ where: { id } });
  }
}

export const lineRoleRepository = new LineRoleRepository();
