import { NextRequest, NextResponse } from 'next/server';
import { invoiceService } from '@/services/invoice.service';
import { createInvoiceSchema, setOpeningBalanceSchema } from '@/validations/invoice';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { authenticate } from '@/controllers/user.controller';
import { parsePagination } from '@/lib/pagination';
import { renderInvoicePdf, InvoiceSnapshot } from '@/lib/invoice-pdf';
import { InvoiceFilters } from '@/repositories/invoice.repository';
import type { InvoiceDisplayStatus } from '@/lib/balance';

export class InvoiceController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const filters: InvoiceFilters = {
      customerId: searchParams.get('customerId') ?? undefined,
      paymentStatus: (searchParams.get('paymentStatus') as InvoiceDisplayStatus) ?? undefined,
      from: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
      to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
      search: searchParams.get('search') ?? undefined,
    };
    const { page, limit, skip, take } = parsePagination(searchParams);

    const [{ data, total }, summary] = await Promise.all([
      invoiceService.getAll({ ...filters, skip, take }),
      invoiceService.getSummary(filters),
    ]);

    return paginatedResponse(data, { page, limit, total }, { summary });
  }

  async getById(_req: NextRequest, id: string) {
    const invoice = await invoiceService.getById(id);
    const { items, customer, dispatchEntry, ...rest } = invoice;

    const response = {
      ...rest,
      customer,
      dispatchEntry,
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
        cgst: item.cgst,
        sgst: item.sgst,
        igst: item.igst,
        lineTotal: item.lineTotal,
      })),
    };

    return successResponse(response);
  }

  async create(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = createInvoiceSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const invoice = await invoiceService.create(validated.data);

    const response = {
      ...invoice,
      items: invoice.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        cgst: item.cgst,
        sgst: item.sgst,
        igst: item.igst,
        lineTotal: item.lineTotal,
      })),
    };

    return successResponse(response, 201);
  }

  async setOpeningBalance(req: NextRequest, customerId: string) {
    authenticate(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = setOpeningBalanceSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const invoice = await invoiceService.setOpeningBalance(
      customerId,
      validated.data.totalAmount,
      validated.data.asOfDate
    );
    return successResponse(invoice);
  }

  async getPdf(_req: NextRequest, id: string) {
    const invoice = await invoiceService.getSnapshotById(id);
    const pdfBuffer = await renderInvoicePdf(invoice.snapshot as unknown as InvoiceSnapshot);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoiceNo}.pdf"`,
      },
    });
  }
}

export const invoiceController = new InvoiceController();
