import { NextRequest } from 'next/server';
import { PaymentMode } from '@prisma/client';
import { paymentService } from '@/services/payment.service';
import { createPaymentSchema, updateAllocationsSchema } from '@/validations/payment';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { getPaymentOnAccount } from '@/lib/balance';
import { authenticate } from '@/controllers/user.controller';
import { parsePagination } from '@/lib/pagination';
import { PaymentFilters } from '@/repositories/payment.repository';

async function parseBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BadRequestError('Invalid JSON body');
  }
}

export class PaymentController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const filters: PaymentFilters = {
      customerId: searchParams.get('customerId') ?? undefined,
      mode: (searchParams.get('mode') as PaymentMode) ?? undefined,
      from: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
      to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
      search: searchParams.get('search') ?? undefined,
    };
    const { page, limit, skip, take } = parsePagination(searchParams);

    const [{ data, total }, summary] = await Promise.all([
      paymentService.getAll({ ...filters, skip, take }),
      paymentService.getSummary(filters),
    ]);

    return paginatedResponse(data, { page, limit, total }, { summary });
  }

  async getById(_req: NextRequest, id: string) {
    const payment = await paymentService.getById(id);
    const { allocations, ...rest } = payment;

    return successResponse({
      ...rest,
      onAccount: getPaymentOnAccount(payment.amount, allocations),
      allocations: allocations.map((allocation) => ({
        id: allocation.id,
        invoiceId: allocation.invoiceId,
        invoiceNo: allocation.invoice?.invoiceNo ?? null,
        amount: allocation.amount,
        note: allocation.note,
        createdAt: allocation.createdAt,
      })),
    });
  }

  async create(req: NextRequest) {
    const currentUser = authenticate(req);
    const body = await parseBody(req);

    const validated = createPaymentSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const payment = await paymentService.create(validated.data, String(currentUser.id));
    return successResponse(payment, 201);
  }

  async updateAllocations(req: NextRequest, id: string) {
    authenticate(req);
    const body = await parseBody(req);

    const validated = updateAllocationsSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const payment = await paymentService.updateAllocations(id, validated.data);
    return successResponse(payment);
  }

  async void(req: NextRequest, id: string) {
    authenticate(req);
    const payment = await paymentService.voidPayment(id);
    return successResponse(payment);
  }

  async getByCustomer(_req: NextRequest, customerId: string) {
    const payments = await paymentService.getByCustomerId(customerId);
    return successResponse(payments);
  }

  async getLedger(_req: NextRequest, customerId: string) {
    const ledger = await paymentService.getLedger(customerId);
    return successResponse(ledger);
  }

  async getOpenInvoices(_req: NextRequest, customerId: string) {
    const openInvoices = await paymentService.getOpenInvoices(customerId);
    return successResponse(openInvoices);
  }

  async getByInvoice(_req: NextRequest, invoiceId: string) {
    const allocations = await paymentService.getAllocationsByInvoiceId(invoiceId);

    const response = allocations.map((allocation) => ({
      id: allocation.id,
      amount: allocation.amount,
      note: allocation.note,
      createdAt: allocation.createdAt,
      payment: allocation.payment,
    }));

    return successResponse(response);
  }
}

export const paymentController = new PaymentController();
