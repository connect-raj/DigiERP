import { NextRequest } from 'next/server';
import { PaymentMode } from '@prisma/client';
import { paymentService } from '@/services/payment.service';
import { createPaymentSchema, allocatePaymentsSchema } from '@/validations/payment';
import { successResponse, BadRequestError } from '@/lib/errors';
import { authenticate } from '@/controllers/user.controller';

export class PaymentController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') ?? undefined;
    const modeParam = searchParams.get('mode');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search') ?? undefined;

    const payments = await paymentService.getAll({
      customerId,
      mode: modeParam ? (modeParam as PaymentMode) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      search,
    });

    return successResponse(payments);
  }

  async getById(_req: NextRequest, id: string) {
    const payment = await paymentService.getById(id);
    const { allocations, ...rest } = payment;

    const response = {
      ...rest,
      allocations: allocations.map((allocation) => ({
        id: allocation.id,
        invoiceId: allocation.invoiceId,
        invoiceNo: allocation.invoice.invoiceNo,
        amount: allocation.amount,
        createdAt: allocation.createdAt,
      })),
    };

    return successResponse(response);
  }

  async create(req: NextRequest) {
    const currentUser = authenticate(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createPaymentSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const payment = await paymentService.create(validated.data, String(currentUser.id));
    return successResponse(payment, 201);
  }

  async allocate(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = allocatePaymentsSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const result = await paymentService.allocate(validated.data);

    return successResponse(
      {
        created: result.created,
        updatedInvoices: result.updatedInvoices,
        updatedPayments: result.updatedPayments,
      },
      result.replay ? 200 : 201
    );
  }

  async getByCustomer(_req: NextRequest, customerId: string) {
    const payments = await paymentService.getByCustomerId(customerId);
    return successResponse(payments);
  }

  async getByInvoice(_req: NextRequest, invoiceId: string) {
    const allocations = await paymentService.getAllocationsByInvoiceId(invoiceId);

    const response = allocations.map((allocation) => ({
      id: allocation.id,
      amount: allocation.amount,
      createdAt: allocation.createdAt,
      payment: allocation.payment,
    }));

    return successResponse(response);
  }
}

export const paymentController = new PaymentController();
