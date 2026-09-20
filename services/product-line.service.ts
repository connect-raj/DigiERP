import { Prisma, ProductKind } from '@prisma/client';
import {
  productLineRepository,
  ProductLineFilters,
  ProductLineWriteData,
} from '@/repositories/product-line.repository';
import { lineRoleRepository } from '@/repositories/line-role.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';
import {
  CreateProductLineInput,
  UpdateProductLineInput,
  kindConditionalErrors,
} from '@/validations/product-line';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface MergedKindCheckInput {
  kind: ProductKind;
  technologyId?: string | null;
  roleId?: string | null;
  formatId?: string | null;
  colourSetId?: string | null;
  printheadIds?: string[];
}

export class ProductLineService {
  async getAll(filters: ProductLineFilters) {
    return productLineRepository.findAll(filters);
  }

  async getById(id: string) {
    const productLine = await productLineRepository.findById(id);
    if (!productLine) {
      throw new NotFoundError(`Product line with id '${id}' not found`);
    }
    return productLine;
  }

  async create(data: CreateProductLineInput) {
    await this.assertKindRules(data);

    const slug = data.slug?.trim() || slugify(data.name);
    if (!slug) {
      throw new BadRequestError('Could not derive a slug from the name — please provide one');
    }

    const writeData: ProductLineWriteData = {
      kind: data.kind,
      name: data.name,
      slug,
      brandId: data.brandId,
      technologyId: data.technologyId,
      formatId: data.formatId,
      roleId: data.roleId,
      colourSetId: data.colourSetId,
      taxClassId: data.taxClassId,
      invoiceName: data.invoiceName,
      aliases: data.aliases,
      isActive: data.isActive,
      printheadIds: data.printheadIds,
    };

    try {
      return await productLineRepository.create(writeData);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async update(id: string, data: UpdateProductLineInput) {
    const existing = await this.getById(id);

    // slug is immutable after creation — a name change never re-slugs an
    // existing line; ignore any slug the client sends on update.
    const patch: UpdateProductLineInput = { ...data };
    delete patch.slug;

    const merged: MergedKindCheckInput = {
      kind: patch.kind ?? existing.kind,
      technologyId:
        patch.technologyId !== undefined ? patch.technologyId : (existing.technologyId ?? undefined),
      roleId: patch.roleId !== undefined ? patch.roleId : (existing.roleId ?? undefined),
      formatId: patch.formatId !== undefined ? patch.formatId : (existing.formatId ?? undefined),
      colourSetId:
        patch.colourSetId !== undefined ? patch.colourSetId : (existing.colourSetId ?? undefined),
      printheadIds:
        patch.printheadIds !== undefined
          ? patch.printheadIds
          : existing.heads.map((h) => h.printheadId),
    };

    await this.assertKindRules(merged);

    try {
      return await productLineRepository.update(id, patch);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async delete(id: string) {
    await this.getById(id);
    await productLineRepository.delete(id);
  }

  /**
   * Kind-conditional rules. Zod already enforces the technology/role/format/
   * printhead requirements on create; this re-checks them (needed for update,
   * where Zod only sees the partial patch) and additionally enforces the
   * colour-set-required-when-role-uses-colours rule, which needs a DB lookup
   * Zod cannot perform.
   */
  private async assertKindRules(data: MergedKindCheckInput) {
    const errors = kindConditionalErrors(data);

    if (data.kind === 'INK' && data.roleId) {
      const role = await lineRoleRepository.findById(data.roleId);
      if (role?.usesColours && !data.colourSetId) {
        errors.push(`Colour set is required for INK lines with role '${role.name}'`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestError(errors.join('; '));
    }
  }

  private mapWriteError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[] | undefined)?.join(',') ?? '';
      const field = target.includes('slug') ? 'slug' : 'name';
      return new BadRequestError(
        `A product line with this ${field} already exists`,
        'PRODUCT_LINE_ALREADY_EXISTS'
      );
    }
    return error;
  }
}

export const productLineService = new ProductLineService();
