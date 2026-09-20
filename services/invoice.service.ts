import { DocStatus, ProductKind } from '@prisma/client';
import {
  invoiceRepository,
  InvoiceFilters,
  CreateInvoiceItemInput,
} from '@/repositories/invoice.repository';
import { customerRepository } from '@/repositories/customer.repository';
import { NotFoundError, BadRequestError, AppError } from '@/lib/errors';
import { determineGstType } from '@/lib/gst';
import { getEffectiveTaxClass, assertHasHsnCode } from '@/lib/tax-class';
import { CreateInvoiceInput } from '@/validations/invoice';

/** A dispatch entry item as returned by invoiceRepository.findDispatchEntryForInvoicing. */
type DispatchItemForInvoicing = NonNullable<
  Awaited<ReturnType<typeof invoiceRepository.findDispatchEntryForInvoicing>>
>['items'][number];

interface ItemOverride {
  printedNameOverride?: string;
  rememberForCustomer?: boolean;
}

/**
 * Resolves the display/printed name, effective tax class, and price-zero flag for a
 * dispatch entry item — shared by both invoice creation and the invoicing preview so
 * the two never drift apart.
 */
function resolveInvoiceItem(item: DispatchItemForInvoicing, override?: ItemOverride) {
  const price = Number(item.price);
  const quantity = Number(item.quantity);
  const line = item.product.line;
  const effectiveTaxClass = getEffectiveTaxClass(item.product);

  // Editable tier: request override (this invoice only) -> remembered customer override ->
  // line's own invoice name -> real name. The colour/pack suffix for INK is auto-appended,
  // never part of the editable base name.
  const overrideName = override?.printedNameOverride ?? item.customerLineInvoiceName ?? undefined;
  const baseName =
    line.kind === ProductKind.INK
      ? (overrideName ?? line.invoiceName ?? line.name)
      : (overrideName ?? line.invoiceName ?? item.product.name);

  const colourName = item.product.colour?.name ?? null;
  const packSize = item.product.packSize != null ? Number(item.product.packSize) : null;
  const unitName = item.product.unit.name;

  const printedName =
    line.kind === ProductKind.INK
      ? `${baseName} – ${colourName ?? ''} – ${packSize ?? ''} ${unitName}`
      : baseName;

  return {
    productId: item.productId,
    productName: item.product.name,
    lineId: line.id,
    lineKind: line.kind,
    lineName: line.name,
    baseName,
    printedName,
    colourName,
    packSize,
    unitName,
    quantity,
    price,
    priceIsZero: price === 0,
    effectiveTaxClass,
    taxClassMissingHsn: !effectiveTaxClass.hsnCode || effectiveTaxClass.hsnCode.trim() === '',
  };
}

export class InvoiceService {
  async getAll(filters: InvoiceFilters) {
    return invoiceRepository.findAll(filters);
  }

  async getSummary(filters: InvoiceFilters) {
    const rows = await invoiceRepository.findStatsRows(filters);

    let totalInvoiced = 0;
    let outstanding = 0;
    let paid = 0;
    let pendingCount = 0;

    for (const row of rows) {
      if (row.status !== 'ACTIVE') continue;
      const total = Number(row.totalAmount);
      const balanceDue = Number(row.balanceDue);
      totalInvoiced += total;
      paid += total - balanceDue;
      if (balanceDue > 0.005) {
        outstanding += balanceDue;
        pendingCount += 1;
      }
    }

    return { totalInvoiced, outstanding, paid, pendingCount };
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

    const overridesByProductId = new Map(
      (data.items ?? []).map((it) => [it.productId, it] as const)
    );

    let totalAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const items: CreateInvoiceItemInput[] = dispatchEntry.items.map((item) => {
      const override = overridesByProductId.get(item.productId);
      const resolved = resolveInvoiceItem(item, override);

      if (resolved.priceIsZero) {
        throw new BadRequestError(
          `Price not set for '${resolved.productName}' — set a customer price or product base price before invoicing.`,
          'PRICE_NOT_SET'
        );
      }
      assertHasHsnCode(resolved.effectiveTaxClass, resolved.productName);

      const gstRate = Number(resolved.effectiveTaxClass.gstRate);
      const baseTotal = resolved.price * resolved.quantity;

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
        productId: resolved.productId,
        productName: resolved.productName,
        lineId: resolved.lineId,
        lineName: resolved.lineName,
        printedName: resolved.printedName,
        hsnCode: resolved.effectiveTaxClass.hsnCode!,
        unit: resolved.unitName,
        quantity: resolved.quantity,
        price: resolved.price,
        cgst,
        sgst,
        igst,
        lineTotal,
        printedNameOverride: override?.printedNameOverride,
        rememberForCustomer: override?.rememberForCustomer,
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

  /**
   * Read-only preview of how a dispatch entry's items would resolve at invoicing time —
   * printed names, price-zero and missing-HSN flags — so the invoice screen can surface
   * problems (and let the user edit the printed name) before submitting.
   */
  async getInvoicingPreview(dispatchEntryId: string) {
    const dispatchEntry = await invoiceRepository.findDispatchEntryForInvoicing(dispatchEntryId);
    if (!dispatchEntry) {
      throw new NotFoundError(
        `Dispatch entry with id '${dispatchEntryId}' not found`,
        'DISPATCH_ENTRY_NOT_FOUND'
      );
    }

    const items = dispatchEntry.items.map((item) => {
      const resolved = resolveInvoiceItem(item);
      return {
        productId: resolved.productId,
        productName: resolved.productName,
        lineId: resolved.lineId,
        lineKind: resolved.lineKind,
        lineName: resolved.lineName,
        baseName: resolved.baseName,
        printedName: resolved.printedName,
        colourName: resolved.colourName,
        packSize: resolved.packSize,
        unitName: resolved.unitName,
        quantity: resolved.quantity,
        price: resolved.price,
        priceIsZero: resolved.priceIsZero,
        taxClassMissingHsn: resolved.taxClassMissingHsn,
      };
    });

    return {
      dispatchEntryId: dispatchEntry.id,
      customerId: dispatchEntry.customerId,
      items,
    };
  }

  async setOpeningBalance(customerId: string, totalAmount: number, asOfDate: string) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError(`Customer with id '${customerId}' not found`);
    }
    return invoiceRepository.upsertOpeningBalance(customerId, totalAmount, new Date(asOfDate));
  }
}

export const invoiceService = new InvoiceService();
