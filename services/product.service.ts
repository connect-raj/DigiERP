import { Prisma } from '@prisma/client';
import { productRepository, ProductWriteData } from '@/repositories/product.repository';
import { productLineRepository } from '@/repositories/product-line.repository';
import { unitRepository } from '@/repositories/unit.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';
import { CreateProductInput, UpdateProductInput, AdjustStockInput } from '@/validations/product';

export class ProductService {
  async getAll(params: {
    lineId?: string;
    isActive?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    return productRepository.findAll(params);
  }

  async getById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with id '${id}' not found`);
    }
    return product;
  }

  async create(data: CreateProductInput) {
    const line = await productLineRepository.findById(data.lineId);
    if (!line) {
      throw new NotFoundError(`Product line with id '${data.lineId}' not found`);
    }

    const unit = await unitRepository.findById(data.unitId);
    if (!unit) {
      throw new NotFoundError(`Unit with id '${data.unitId}' not found`);
    }
    if (!unit.appliesTo.includes(line.kind)) {
      throw new BadRequestError(`Unit '${unit.name}' cannot be used for ${line.kind} products`);
    }

    let name: string;
    let packSize: number | null = null;
    let colourId: string | null = null;

    if (line.kind === 'INK') {
      if (data.packSize === undefined || data.packSize <= 0) {
        throw new BadRequestError(
          'Pack size is required and must be greater than 0 for INK products'
        );
      }
      packSize = data.packSize;

      const usesColours = !!line.role?.usesColours;
      if (usesColours && !data.colourId) {
        throw new BadRequestError(
          `Colour is required for INK products on the '${line.name}' line`
        );
      }

      let colourName: string | undefined;
      if (data.colourId) {
        const match = line.colourSet?.colours.find((c) => c.colourId === data.colourId);
        if (!match) {
          throw new BadRequestError("Selected colour does not belong to this line's colour set");
        }
        colourId = data.colourId;
        colourName = match.colour.name;
      }

      name = this.generateInkName(line.name, colourName, packSize, unit.name);
    } else {
      if (data.packSize !== undefined) {
        throw new BadRequestError(`Pack size does not apply to ${line.kind} products`);
      }
      if (data.colourId) {
        throw new BadRequestError(`Colour does not apply to ${line.kind} products`);
      }
      if (!data.name || !data.name.trim()) {
        throw new BadRequestError('Name is required for this product');
      }
      name = data.name.trim();
    }

    const writeData: ProductWriteData = {
      lineId: data.lineId,
      name,
      unitId: data.unitId,
      packSize,
      colourId,
      specs: data.specs as Prisma.InputJsonValue | undefined,
      taxClassId: data.taxClassId ?? null,
      basePrice: data.basePrice ?? 0,
      lowerStockLimit: data.lowerStockLimit ?? 0,
    };

    try {
      return await productRepository.create(writeData);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async update(id: string, data: UpdateProductInput) {
    const existing = await this.getById(id);

    const lineId = data.lineId ?? existing.lineId;
    const line = await productLineRepository.findById(lineId);
    if (!line) {
      throw new NotFoundError(`Product line with id '${lineId}' not found`);
    }

    const unitId = data.unitId ?? existing.unitId;
    const unit = await unitRepository.findById(unitId);
    if (!unit) {
      throw new NotFoundError(`Unit with id '${unitId}' not found`);
    }
    if (!unit.appliesTo.includes(line.kind)) {
      throw new BadRequestError(`Unit '${unit.name}' cannot be used for ${line.kind} products`);
    }

    const mergedPackSize =
      data.packSize !== undefined
        ? data.packSize
        : existing.packSize !== null
          ? Number(existing.packSize)
          : null;
    const mergedColourId = data.colourId !== undefined ? data.colourId : existing.colourId;

    let name: string;
    let packSize: number | null = null;
    let colourId: string | null = null;

    if (line.kind === 'INK') {
      if (mergedPackSize === null || mergedPackSize <= 0) {
        throw new BadRequestError(
          'Pack size is required and must be greater than 0 for INK products'
        );
      }
      packSize = mergedPackSize;

      const usesColours = !!line.role?.usesColours;
      if (usesColours && !mergedColourId) {
        throw new BadRequestError(
          `Colour is required for INK products on the '${line.name}' line`
        );
      }

      let colourName: string | undefined;
      if (mergedColourId) {
        const match = line.colourSet?.colours.find((c) => c.colourId === mergedColourId);
        if (!match) {
          throw new BadRequestError("Selected colour does not belong to this line's colour set");
        }
        colourId = mergedColourId;
        colourName = match.colour.name;
      }

      // Re-derived any time line/colour/packSize/unit could have changed —
      // recomputing from the merged values is idempotent when nothing did.
      name = this.generateInkName(line.name, colourName, packSize, unit.name);
    } else {
      // Explicitly setting packSize/colourId on a non-INK product is a
      // client error; silently dropping stale INK-only values carried over
      // from a line-kind change is not.
      if (data.packSize !== undefined && data.packSize !== null) {
        throw new BadRequestError(`Pack size does not apply to ${line.kind} products`);
      }
      if (data.colourId) {
        throw new BadRequestError(`Colour does not apply to ${line.kind} products`);
      }

      const rawName = data.name !== undefined ? data.name : existing.name;
      name = (rawName ?? '').trim();
      if (!name) {
        throw new BadRequestError('Name is required for this product');
      }
    }

    const writeData: Partial<ProductWriteData> = {
      lineId,
      name,
      unitId,
      packSize,
      colourId,
      ...(data.specs !== undefined && {
        specs: (data.specs === null ? Prisma.JsonNull : data.specs) as
          | Prisma.InputJsonValue
          | typeof Prisma.JsonNull,
      }),
      ...(data.taxClassId !== undefined && { taxClassId: data.taxClassId }),
      ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
      ...(data.lowerStockLimit !== undefined && { lowerStockLimit: data.lowerStockLimit }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    };

    try {
      return await productRepository.update(id, writeData);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async delete(id: string): Promise<void> {
    const product = await this.getById(id);

    if (Number(product.currentStock) > 0) {
      throw new BadRequestError('Cannot delete product with existing stock', 'PRODUCT_HAS_STOCK');
    }

    const hasOpenChallans = await productRepository.hasOpenChallans(id);
    if (hasOpenChallans) {
      throw new BadRequestError(
        'Cannot delete product with open challans',
        'PRODUCT_HAS_OPEN_CHALLANS'
      );
    }

    await productRepository.softDelete(id);
  }

  async getStock(id: string) {
    await this.getById(id);
    return productRepository.getStock(id);
  }

  async adjustStock(id: string, input: AdjustStockInput) {
    const product = await this.getById(id);
    const newStock = Number(product.currentStock) + input.quantity;

    if (newStock < 0) {
      throw new BadRequestError(
        `Insufficient stock. Current: ${product.currentStock}, Requested: ${input.quantity}`,
        'INSUFFICIENT_STOCK'
      );
    }

    return productRepository.adjustStock(id, input.quantity, input.reason as string);
  }

  /** Mirrors the server-side generation rule: line – [colour] – packSize unit. */
  private generateInkName(
    lineName: string,
    colourName: string | undefined,
    packSize: number,
    unitName: string
  ): string {
    const parts = [lineName];
    if (colourName) parts.push(colourName);
    parts.push(`${packSize} ${unitName}`);
    return parts.join(' – ');
  }

  private mapWriteError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new BadRequestError(
        'A product with this name already exists in this product line',
        'PRODUCT_ALREADY_EXISTS'
      );
    }
    return error;
  }
}

export const productService = new ProductService();
