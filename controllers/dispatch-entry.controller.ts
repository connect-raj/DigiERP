import { NextRequest, NextResponse } from 'next/server';
import { DocStatus } from '@prisma/client';
import { dispatchEntryService } from '@/services/dispatch-entry.service';
import { createDispatchEntrySchema } from '@/validations/dispatch-entry';
import { successResponse, BadRequestError } from '@/lib/errors';

export class DispatchEntryController {
  async getAll(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') ?? undefined;
    const statusParam = searchParams.get('status');
    const isCancelledParam = searchParams.get('isCancelled');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search') ?? undefined;

    const entries = await dispatchEntryService.getAll({
      customerId,
      status: statusParam ? (statusParam as DocStatus) : undefined,
      isCancelled: isCancelledParam !== null ? isCancelledParam === 'true' : false,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      search,
    });

    const formatted = entries.map((entry) => {
      const { _count, ...rest } = entry;
      return { ...rest, itemCount: _count.items };
    });

    return successResponse(formatted);
  }

  async getById(_req: NextRequest, id: string) {
    const dispatchEntry = await dispatchEntryService.getById(id);
    const { items, customer, invoice, stockTxns, ...rest } = dispatchEntry;

    const response = {
      ...rest,
      customer: {
        id: customer.id,
        firmName: customer.firmName,
        state: customer.state,
        gstin: customer.gstin,
      },
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        categoryName: item.product.category.name,
        quantity: item.quantity,
        price: item.price,
        lineTotal: item.lineTotal,
      })),
      invoice: invoice
        ? {
            id: invoice.id,
            invoiceNo: invoice.invoiceNo,
            date: invoice.date,
            paymentStatus: invoice.paymentStatus,
          }
        : null,
      stockTransactions: stockTxns.map((txn) => ({
        id: txn.id,
        productId: txn.productId,
        productName: txn.product.name,
        changeQty: txn.changeQty,
        stockBefore: txn.stockBefore,
        stockAfter: txn.stockAfter,
        reason: txn.reason,
        createdAt: txn.createdAt,
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

    const validated = createDispatchEntrySchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const { dispatchEntry, warning } = await dispatchEntryService.create(validated.data);

    if (warning) {
      return NextResponse.json({ success: true, data: dispatchEntry, warning }, { status: 201 });
    }
    return successResponse(dispatchEntry, 201);
  }

  async cancel(_req: NextRequest, id: string) {
    const stockRestored = await dispatchEntryService.cancel(id);
    return NextResponse.json({ success: true, stockRestored }, { status: 200 });
  }
}

export const dispatchEntryController = new DispatchEntryController();
