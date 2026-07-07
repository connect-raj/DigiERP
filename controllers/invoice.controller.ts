import { NextRequest, NextResponse } from 'next/server';
import { PaymentStatus } from '@prisma/client';
import { invoiceService } from '@/services/invoice.service';
import { createInvoiceSchema } from '@/validations/invoice';
import { successResponse, BadRequestError } from '@/lib/errors';
import { renderInvoicePdf, InvoiceSnapshot } from '@/lib/invoice-pdf';

export class InvoiceController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') ?? undefined;
    const paymentStatusParam = searchParams.get('paymentStatus');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search') ?? undefined;

    const invoices = await invoiceService.getAll({
      customerId,
      paymentStatus: paymentStatusParam ? (paymentStatusParam as PaymentStatus) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      search,
    });

    return successResponse(invoices);
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
