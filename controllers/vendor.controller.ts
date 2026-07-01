import { NextRequest } from 'next/server';
import { vendorService } from '@/services/vendor.service';
import {
  createVendorSchema,
  updateVendorSchema,
  linkVendorProductsSchema,
} from '@/validations/vendor';
import { successResponse, BadRequestError } from '@/lib/errors';

export class VendorController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const isActiveParam = searchParams.get('isActive');
    const search = searchParams.get('search') ?? undefined;

    const isActive =
      isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

    const vendors = await vendorService.getAll({ isActive, search });
    return successResponse(vendors);
  }

  async getById(_req: NextRequest, id: string) {
    const vendor = await vendorService.getById(id);
    return successResponse(vendor);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createVendorSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const vendor = await vendorService.create(validated.data);
    return successResponse(vendor, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateVendorSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const vendor = await vendorService.update(id, validated.data);
    return successResponse(vendor);
  }

  async delete(_req: NextRequest, id: string) {
    await vendorService.delete(id);
    return successResponse({ success: true });
  }

  async linkProducts(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = linkVendorProductsSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const linked = await vendorService.linkProducts(id, validated.data);
    return successResponse({ linked });
  }

  async unlinkProduct(_req: NextRequest, vendorId: string, productId: string) {
    await vendorService.unlinkProduct(vendorId, productId);
    return successResponse({ success: true });
  }
}

export const vendorController = new VendorController();
