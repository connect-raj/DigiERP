import { NextRequest } from 'next/server';
import { customerService } from '@/services/customer.service';
import {
  createCustomerSchema,
  updateCustomerSchema,
  setCustomerPriceSchema,
  createCustomerLineInvoiceNameSchema,
  updateCustomerLineInvoiceNameSchema,
} from '@/validations/customer';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';

export class CustomerController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam === null ? undefined : isActiveParam === 'true';
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await customerService.getAll({ search, isActive, skip, take });
    return paginatedResponse(data, { page, limit, total });
  }

  async getById(_req: NextRequest, id: string) {
    const customer = await customerService.getById(id);
    return successResponse(customer);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createCustomerSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const customer = await customerService.create(validated.data);
    return successResponse(customer, 201);
  }

  async update(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateCustomerSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const customer = await customerService.update(id, validated.data);
    return successResponse(customer);
  }

  async delete(_req: NextRequest, id: string) {
    await customerService.delete(id);
    return successResponse({ id, isActive: false });
  }

  async getPrices(_req: NextRequest, id: string) {
    const prices = await customerService.getPrices(id);
    return successResponse(prices);
  }

  async getPriceHistory(req: NextRequest, id: string) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId') ?? undefined;
    const history = await customerService.getPriceHistory(id, productId);
    return successResponse(history);
  }

  async setPrice(req: NextRequest, id: string, productId: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = setCustomerPriceSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const price = await customerService.setManualPrice(id, productId, validated.data.price);
    return successResponse(price);
  }

  async getLineInvoiceNames(_req: NextRequest, id: string) {
    const names = await customerService.getLineInvoiceNames(id);
    return successResponse(names);
  }

  async createLineInvoiceName(req: NextRequest, id: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createCustomerLineInvoiceNameSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const name = await customerService.createLineInvoiceName(id, validated.data);
    return successResponse(name, 201);
  }

  async updateLineInvoiceName(req: NextRequest, id: string, nameId: string) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateCustomerLineInvoiceNameSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const name = await customerService.updateLineInvoiceName(id, nameId, validated.data);
    return successResponse(name);
  }

  async deleteLineInvoiceName(_req: NextRequest, id: string, nameId: string) {
    await customerService.deleteLineInvoiceName(id, nameId);
    return successResponse({ id: nameId });
  }
}

export const customerController = new CustomerController();
