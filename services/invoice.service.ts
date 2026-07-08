import { DocStatus } from '@prisma/client';
import {
  invoiceRepository,
  InvoiceFilters,
  CreateInvoiceItemInput,
} from '@/repositories/invoice.repository';
import { NotFoundError, BadRequestError, AppError } from '@/lib/errors';
import { determineGstType } from '@/lib/gst';
import { CreateInvoiceInput } from '@/validations/invoice';

export class InvoiceService {
  async getAll(filters: InvoiceFilters) {
    return invoiceRepository.findAll(filters);
  }

  async getById(id: string) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) {
      throw new NotFoundError(`Invoice with id '${id}' not found`);
    }
    return invoice;
  }

  async getSnapshotById(id: string) {
    const invoice = await invoiceRepository.findSnapshotById(id);
    if (!invoice) {
      throw new NotFoundError(`Invoice with id '${id}' not found`);
    }
    return invoice;
  }

  async create(data: CreateInvoiceInput) {
    const dispatchEntry = await invoiceRepository.findDispatchEntryForInvoicing(
      data.dispatchEntryId
    );
    if (!dispatchEntry) {
      throw new NotFoundError(
        `Dispatch entry with id '${data.dispatchEntryId}' not found`,
        'DISPATCH_ENTRY_NOT_FOUND'
      );
    }
    if (dispatchEntry.isCancelled) {
      throw new BadRequestError(
        'Cannot invoice a cancelled dispatch entry',
        'DISPATCH_ENTRY_CANCELLED'
      );
    }
    if (dispatchEntry.status !== DocStatus.PENDING_BILLING) {
      throw new BadRequestError(
        'This dispatch entry has already been invoiced',
        'DISPATCH_ENTRY_ALREADY_BILLED'
      );
    }

    const settings = await invoiceRepository.findSettings();
    if (!settings) {
      throw new AppError(500, 'Company settings are not configured', 'SETTINGS_NOT_CONFIGURED');
    }

    const gstType = determineGstType(settings.companyState, dispatchEntry.customer.state);

    let totalAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const items: CreateInvoiceItemInput[] = dispatchEntry.items.map((item) => {
      const price = Number(item.price);
      const quantity = Number(item.quantity);
      const gstRate = Number(item.product.category.gstRate);
      const baseTotal = price * quantity;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      if (gstType === 'CGST_SGST') {
        cgst = (baseTotal * (gstRate / 2)) / 100;
        sgst = (baseTotal * (gstRate / 2)) / 100;
      } else {
        igst = (baseTotal * gstRate) / 100;
      }
      const lineTotal = baseTotal + cgst + sgst + igst;

      totalAmount += lineTotal;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;

      return {
        productId: item.productId,
        productName: item.product.name,
        categoryName: item.product.category.name,
        hsnCode: item.product.category.hsnCode,
        unit: item.product.unit,
        quantity,
        price,
        cgst,
        sgst,
        igst,
        lineTotal,
      };
    });

    const invoiceDate = data.date ? new Date(data.date) : new Date();

    const invoice = await invoiceRepository.createInvoiceTx({
      dispatchEntryId: dispatchEntry.id,
      customerId: dispatchEntry.customerId,
      date: invoiceDate,
      place: dispatchEntry.place,
      transport: dispatchEntry.transport,
      totalAmount,
      totalCgst,
      totalSgst,
      totalIgst,
      items,
      company: {
        name: settings.companyName,
        address: settings.companyAddress,
        state: settings.companyState,
        gstin: settings.companyGstin,
        pan: settings.companyPan,
      },
      customerSnapshot: {
        firmName: dispatchEntry.customer.firmName,
        address: dispatchEntry.customer.address ?? '',
        city: dispatchEntry.customer.city ?? '',
        state: dispatchEntry.customer.state,
        gstin: dispatchEntry.customer.gstin,
      },
      dispatchReference: {
        challanNo: dispatchEntry.challanNo,
        dispatchDate: dispatchEntry.date,
      },
    });

    return invoice;
  }
}

export const invoiceService = new InvoiceService();
