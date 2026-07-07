import { NextRequest } from 'next/server';
import { customerService } from '@/services/customer.service';
import { createCustomerSchema, updateCustomerSchema } from '@/validations/customer';
import { successResponse, BadRequestError } from '@/lib/errors';

export class CustomerController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;

    const customers = await customerService.getAll(search);
    return successResponse(customers);
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

  async getPrices(_req: NextRequest, id: string) {
    const prices = await customerService.getPrices(id);
    return successResponse(prices);
  }
}

export const customerController = new CustomerController();
