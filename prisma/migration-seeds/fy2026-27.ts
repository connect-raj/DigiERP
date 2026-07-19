import * as fs from 'fs';
import * as path from 'path';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMode } from '@prisma/client';
import { generateInvoiceNo } from '@/lib/invoice-no';
import { paymentRepository } from '@/repositories/payment.repository';
import { COMPANY_STATE } from '@/lib/constants';
import { readAllSheets, isRealLedgerSheet } from './lib/xlsx-reader';
import { parseLedgerSheet, ParsedDebitBlock, ParsedSheetResult } from './lib/ledger-parser';
import { matchCategory } from './lib/category-matcher';
import {
  canonicalizeFolderName,
  extractCity,
  resolveFirmName,
  GST_INVOICE_ONLY_CUSTOMERS,
  REX_TONE_INDUSTRIES_FOLDER,
} from './lib/customer-matcher';
import { backCalculateGst, splitExplicitGstAmount } from './lib/gst-resolver';

const ARCHIVE_ROOT =
  'docs/migration/Digital Technologies/Digital Technologies/Account Digi_Tech/01.04.2026 to 31.03.2027';
const INK_DIR = path.join(ARCHIVE_ROOT, 'Account', 'INK');
const PRINTER_DIR = path.join(ARCHIVE_ROOT, 'Account', 'Printer');
const REPORT_DIR = path.join('prisma', 'migration-seeds', 'reports');
const TOLERANCE = 1; // rupees
const CHALLAN_PREFIX = 'LEGACY-FY2627';
const ALLOC_IDEMPOTENCY_PREFIX = 'LEGACY-FY2627-ALLOC';

type Segment = 'INK' | 'PRINTER';

interface CustomerRef {
  folderName: string;
  segments: { type: Segment; folderPath: string }[];
}

interface ReportEntry {
  customer: string;
  status:
    | 'COMMITTED'
    | 'COMMITTED_UNALLOCATED'
    | 'SKIPPED_CHECKSUM'
    | 'SKIPPED_UNMATCHED_CATEGORY'
    | 'ALREADY_MIGRATED'
    | 'SKIPPED_ERROR';
  detail?: string;
}

const report: ReportEntry[] = [];
const unmatchedCategoryLog: { customer: string; particulars: string }[] = [];
const unparsedRowLog: { customer: string; reason: string; raw: unknown }[] = [];

function listFolders(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function findLedgerFiles(folderPath: string): string[] {
  if (!fs.existsSync(folderPath)) return [];
  return fs
    .readdirSync(folderPath)
    .filter((f) => /\.xlsx?$/i.test(f) && !f.includes(' - Copy'))
    .map((f) => path.join(folderPath, f));
}

function buildCustomerRegistry(): Map<string, CustomerRef> {
  const registry = new Map<string, CustomerRef>();
  const addSegment = (rawFolderName: string, type: Segment, baseDir: string) => {
    const canonical = canonicalizeFolderName(rawFolderName);
    const folderPath = path.join(baseDir, rawFolderName);
    const existing = registry.get(canonical);
    if (existing) {
      existing.segments.push({ type, folderPath });
    } else {
      registry.set(canonical, { folderName: canonical, segments: [{ type, folderPath }] });
    }
  };
  for (const f of listFolders(INK_DIR)) addSegment(f, 'INK', INK_DIR);
  for (const f of listFolders(PRINTER_DIR)) addSegment(f, 'PRINTER', PRINTER_DIR);
  return registry;
}

function extractSheetHeaderName(rows: unknown[][]): string | null {
  const first = rows[0]?.[0];
  return typeof first === 'string' && first.trim() ? first.trim() : null;
}

async function ensurePrintersCategory(): Promise<string> {
  let category = await prisma.category.findUnique({ where: { name: 'Printers' } });
  if (!category) {
    category = await prisma.category.create({
      data: { name: 'Printers', hsnCode: '8443', gstRate: 18 },
    });
  }
  return category.id;
}

// findFirst-then-create (not upsert) is safe only because customers are
// processed strictly sequentially in main() - no concurrent customer
// processing exists in this script, so there's no race window.
async function ensurePrinterProduct(categoryId: string, name: string): Promise<string> {
  let product = await prisma.product.findFirst({ where: { name, categoryId } });
  if (!product) {
    product = await prisma.product.create({
      data: { name, categoryId, basePrice: 0, unit: 'UNIT' },
    });
  }
  return product.id;
}

async function ensureCategoryProduct(
  categoryName: string,
  colorName: string
): Promise<string | null> {
  const category = await prisma.category.findUnique({ where: { name: categoryName } });
  if (!category) return null;
  let product = await prisma.product.findFirst({
    where: { name: colorName, categoryId: category.id },
  });
  if (!product) {
    product = await prisma.product.create({
      data: { name: colorName, categoryId: category.id, basePrice: 0, unit: 'LTR' },
    });
  }
  return product.id;
}

interface ResolvedItem {
  productId: string;
  quantity: number;
  price: number;
  lineTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
}

interface ResolvedBlock {
  block: ParsedDebitBlock;
  items: ResolvedItem[];
  gstSplit: { taxableValue: number; cgst: number; sgst: number; igst: number };
}

/**
 * Resolves a debit block's line items to real Products, or null if the
 * block's particulars text couldn't be confidently categorized.
 *
 * `block.debitAmount` (and each line item's debitAmount) is the ledger's
 * GST-INCLUSIVE stated figure. `DispatchEntry`/`DispatchEntryItem` price and
 * lineTotal must store the EX-GST (taxable) amount, matching how every
 * organically-created dispatch entry stores it elsewhere in the app
 * (services/dispatch-entry.service.ts) - GST is only added at Invoice time.
 * Resolve gstSplit FIRST, then derive every item's taxable lineTotal from
 * it, rather than treating the inclusive amount as if it were taxable.
 */
async function resolveInkBlock(
  block: ParsedDebitBlock,
  customerState: string
): Promise<ResolvedBlock | null> {
  const gstSplit =
    block.gstAmount !== null
      ? splitExplicitGstAmount(block.debitAmount - block.gstAmount, block.gstAmount, customerState)
      : backCalculateGst(block.debitAmount, 18, customerState);
  const inclusiveToTaxableRatio =
    block.debitAmount > 0 ? gstSplit.taxableValue / block.debitAmount : 0;

  // A block can carry multiple line items when a bill's products are split
  // across several non-contiguous rows sharing the same Bill No - resolve
  // each item's category/price independently against its OWN (taxable)
  // share, not a blended block-wide figure.
  const items: ResolvedItem[] = [];
  for (const lineItem of block.items) {
    const match = matchCategory(lineItem.particulars);
    if (!match) return null;
    const lineItemTaxable = lineItem.debitAmount * inclusiveToTaxableRatio;

    if (match.colors.length > 0) {
      const totalUnits = match.colors.reduce((a, c) => a + c.qty, 0);
      if (totalUnits <= 0) return null;
      const pricePerUnit = lineItemTaxable / totalUnits;
      for (const color of match.colors) {
        const productId = await ensureCategoryProduct(match.categoryName, color.name);
        if (!productId) return null;
        items.push({
          productId,
          quantity: color.qty,
          price: pricePerUnit,
          lineTotal: color.qty * pricePerUnit,
          cgst: 0,
          sgst: 0,
          igst: 0,
        });
      }
    } else {
      const quantity = lineItem.qty ?? 1;
      const productId = await ensureCategoryProduct(match.categoryName, 'Unit');
      if (!productId) return null;
      items.push({
        productId,
        quantity,
        price: lineItemTaxable / quantity,
        lineTotal: lineItemTaxable,
        cgst: 0,
        sgst: 0,
        igst: 0,
      });
    }
  }

  for (const it of items) {
    const share = gstSplit.taxableValue > 0 ? it.lineTotal / gstSplit.taxableValue : 0;
    it.cgst = gstSplit.cgst * share;
    it.sgst = gstSplit.sgst * share;
    it.igst = gstSplit.igst * share;
  }

  return { block, items, gstSplit };
}

async function resolvePrinterBlock(
  block: ParsedDebitBlock,
  printersCategoryId: string,
  customerState: string
): Promise<ResolvedBlock> {
  const primary = block.items[0];
  const productId = await ensurePrinterProduct(printersCategoryId, primary.particulars);
  const gstSplit =
    block.gstAmount !== null
      ? splitExplicitGstAmount(block.debitAmount - block.gstAmount, block.gstAmount, customerState)
      : backCalculateGst(block.debitAmount, 18, customerState);
  const taxableValue = gstSplit.taxableValue;

  const quantity = primary.qty ?? 1;
  return {
    block,
    items: [
      {
        productId,
        quantity,
        price: taxableValue / quantity,
        lineTotal: taxableValue,
        cgst: gstSplit.cgst,
        sgst: gstSplit.sgst,
        igst: gstSplit.igst,
      },
    ],
    gstSplit,
  };
}

interface SheetParseContext {
  segment: Segment;
  sheetLabel: string;
  parsed: ParsedSheetResult;
}

function checksumOk(parsed: ParsedSheetResult): boolean {
  const computedDebit =
    parsed.debitBlocks.reduce((a, b) => a + b.debitAmount, 0) +
    parsed.openingBalances.reduce((a, b) => a + b.amount, 0) +
    parsed.adjustments.filter((a) => a.kind === 'INK_RETURN').reduce((a, b) => a + b.amount, 0);
  const computedCredit =
    parsed.payments.reduce((a, b) => a + b.amount, 0) +
    parsed.adjustments
      .filter((a) => a.kind === 'DISCOUNT' || a.kind === 'CHEQUE_RETURN')
      .reduce((a, b) => a + b.amount, 0);
  const debitOk =
    parsed.statedTotalDebit === null ||
    Math.abs(parsed.statedTotalDebit - computedDebit) <= TOLERANCE;
  const creditOk =
    parsed.statedTotalCredit === null ||
    Math.abs(parsed.statedTotalCredit - computedCredit) <= TOLERANCE;
  return debitOk && creditOk;
}

function paymentModeToEnum(mode: string): PaymentMode {
  return mode as PaymentMode;
}

async function processLedgerCustomer(ref: CustomerRef, printersCategoryId: string): Promise<void> {
  const customerName = ref.folderName;

  const sheetContexts: SheetParseContext[] = [];
  let ledgerHeaderName: string | null = null;
  for (const segment of ref.segments) {
    for (const filePath of findLedgerFiles(segment.folderPath)) {
      let sheets;
      try {
        sheets = readAllSheets(filePath);
      } catch (e) {
        report.push({
          customer: customerName,
          status: 'SKIPPED_ERROR',
          detail: `Failed to read ${filePath}: ${e}`,
        });
        return;
      }
      for (const s of sheets) {
        if (!isRealLedgerSheet(s.rows)) continue;
        if (!ledgerHeaderName) ledgerHeaderName = extractSheetHeaderName(s.rows);
        let parsed: ParsedSheetResult;
        try {
          parsed = parseLedgerSheet(s.rows);
        } catch (e) {
          report.push({
            customer: customerName,
            status: 'SKIPPED_ERROR',
            detail: `Failed to parse sheet "${s.name}" in ${filePath}: ${e}`,
          });
          return;
        }
        sheetContexts.push({ segment: segment.type, sheetLabel: `${filePath}#${s.name}`, parsed });
      }
    }
  }

  if (sheetContexts.length === 0) {
    report.push({
      customer: customerName,
      status: 'SKIPPED_ERROR',
      detail: 'No real ledger sheet found',
    });
    return;
  }

  for (const ctx of sheetContexts) {
    if (!checksumOk(ctx.parsed)) {
      report.push({
        customer: customerName,
        status: 'SKIPPED_CHECKSUM',
        detail: `Sheet ${ctx.sheetLabel}: statedDebit=${ctx.parsed.statedTotalDebit} statedCredit=${ctx.parsed.statedTotalCredit}`,
      });
      for (const u of ctx.parsed.unparsedRows) {
        unparsedRowLog.push({ customer: customerName, reason: u.reason, raw: u.raw });
      }
      return;
    }
  }

  const city = extractCity(customerName);
  const customerState = COMPANY_STATE;

  // Defensive check against misfiled/duplicated source files: if the
  // ledger's in-sheet header implies a different city than the folder it
  // lives in, this is very likely a copy-pasted/misfiled document (verified
  // real case: "Sneh Enterprise, Baroda" contained an exact duplicate of
  // "Arjun Flex, Bhuj"'s ledger). Trusting the header here would silently
  // create a duplicate customer and double-count a real transaction -
  // flag for manual review instead of guessing either way.
  if (ledgerHeaderName && city) {
    // Strip a trailing parenthetical note (e.g. "Elite Media, Surat (Radhe
    // CMYK)") before comparing - that's an annotation, not a different city.
    const headerForCityCheck = ledgerHeaderName.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const headerCity = extractCity(headerForCityCheck);
    if (headerCity && headerCity.toLowerCase() !== city.toLowerCase()) {
      report.push({
        customer: customerName,
        status: 'SKIPPED_ERROR',
        detail: `Ledger header "${ledgerHeaderName}" implies a different city than folder city "${city}" - likely a misfiled/duplicated source file, needs manual review before migrating`,
      });
      return;
    }
  }

  let customer = await prisma.customer.findFirst({
    where: { firmName: resolveFirmName({ folderName: customerName, ledgerHeaderName }), city },
  });
  const firmName = resolveFirmName({ folderName: customerName, ledgerHeaderName });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { firmName, city, state: customerState },
    });
  }

  const alreadyMigrated = await prisma.dispatchEntry.findFirst({
    where: { challanNo: { startsWith: `${CHALLAN_PREFIX}-${customer.id}-` } },
  });
  if (alreadyMigrated) {
    report.push({ customer: customerName, status: 'ALREADY_MIGRATED' });
    return;
  }

  const resolvedBlocks: { ctx: SheetParseContext; resolved: ResolvedBlock }[] = [];
  for (const ctx of sheetContexts) {
    for (const block of ctx.parsed.debitBlocks) {
      const resolved =
        ctx.segment === 'PRINTER'
          ? await resolvePrinterBlock(block, printersCategoryId, customerState)
          : await resolveInkBlock(block, customerState);
      if (!resolved) {
        unmatchedCategoryLog.push({
          customer: customerName,
          particulars: block.items[0].particulars,
        });
        report.push({
          customer: customerName,
          status: 'SKIPPED_UNMATCHED_CATEGORY',
          detail: `Unmatched: "${block.items[0].particulars}"`,
        });
        return;
      }
      resolvedBlocks.push({ ctx, resolved });
    }
  }

  // A single bill can be split across sheets (e.g. one bill's Solvent Ink
  // and UV Ink line items each sit in their own sheet, sharing one Bill
  // No) - merge same-billNo blocks within a segment into one
  // DispatchEntry/Invoice rather than colliding on challanNo. Scoped by
  // segment (INK vs Printer) in case the two use independent bill-number
  // registries - only merge sheets known to share a numbering scheme.
  const mergedByBillNo = new Map<string, ResolvedBlock>();
  const mergedBlocks: ResolvedBlock[] = [];
  for (const { ctx, resolved } of resolvedBlocks) {
    const billNo = resolved.block.billNo;
    const key = billNo ? `${ctx.segment}-${billNo}` : null;
    if (key && mergedByBillNo.has(key)) {
      const existing = mergedByBillNo.get(key)!;
      existing.items.push(...resolved.items);
      existing.block.debitAmount += resolved.block.debitAmount;
      existing.gstSplit.taxableValue += resolved.gstSplit.taxableValue;
      existing.gstSplit.cgst += resolved.gstSplit.cgst;
      existing.gstSplit.sgst += resolved.gstSplit.sgst;
      existing.gstSplit.igst += resolved.gstSplit.igst;
      if (resolved.block.date < existing.block.date) existing.block.date = resolved.block.date;
      continue;
    }
    mergedBlocks.push(resolved);
    if (key) mergedByBillNo.set(key, resolved);
  }

  const openingBalanceTotal = sheetContexts.reduce(
    (a, ctx) => a + ctx.parsed.openingBalances.reduce((x, y) => x + y.amount, 0),
    0
  );
  const inkReturnTotal = sheetContexts.reduce(
    (a, ctx) =>
      a +
      ctx.parsed.adjustments
        .filter((x) => x.kind === 'INK_RETURN')
        .reduce((x, y) => x + y.amount, 0),
    0
  );
  const discountTotal = sheetContexts.reduce(
    (a, ctx) =>
      a +
      ctx.parsed.adjustments.filter((x) => x.kind === 'DISCOUNT').reduce((x, y) => x + y.amount, 0),
    0
  );
  const chequeReturnTotal = sheetContexts.reduce(
    (a, ctx) =>
      a +
      ctx.parsed.adjustments
        .filter((x) => x.kind === 'CHEQUE_RETURN')
        .reduce((x, y) => x + y.amount, 0),
    0
  );

  const createdInvoiceIds: { invoiceId: string; date: Date }[] = [];
  const createdPaymentIds: { paymentId: string; date: Date; amount: number }[] = [];

  try {
    await prisma.$transaction(
      async (tx) => {
        if (openingBalanceTotal !== 0) {
          await tx.customer.update({
            where: { id: customer!.id },
            data: { outstandingBalance: { increment: openingBalanceTotal } },
          });
        }
        if (inkReturnTotal !== 0) {
          await tx.customer.update({
            where: { id: customer!.id },
            data: { outstandingBalance: { decrement: inkReturnTotal } },
          });
        }
        if (discountTotal !== 0) {
          await tx.customer.update({
            where: { id: customer!.id },
            data: { outstandingBalance: { decrement: discountTotal } },
          });
        }
        if (chequeReturnTotal !== 0) {
          await tx.customer.update({
            where: { id: customer!.id },
            data: { outstandingBalance: { increment: chequeReturnTotal } },
          });
        }

        let unbilledIndex = 0;
        for (const resolved of mergedBlocks) {
          const { block, items } = resolved;
          const challanNo = block.billNo
            ? `${CHALLAN_PREFIX}-${customer!.id}-${block.billNo}`
            : `${CHALLAN_PREFIX}-${customer!.id}-NOBILL-${unbilledIndex++}`;

          const dispatchEntry = await tx.dispatchEntry.create({
            data: {
              challanNo,
              customerId: customer!.id,
              place: city ?? 'N/A',
              date: block.date,
              status: block.kind === 'BILLED' ? 'BILLED' : 'PENDING_BILLING',
              // Ex-GST (taxable) total, matching the convention every
              // organically-created DispatchEntry uses elsewhere in the app
              // (services/dispatch-entry.service.ts) - GST is only added at
              // Invoice time, below.
              totalAmount: new Decimal(resolved.gstSplit.taxableValue),
              items: {
                create: items.map((it) => ({
                  productId: it.productId,
                  quantity: new Decimal(it.quantity),
                  price: new Decimal(it.price),
                  lineTotal: new Decimal(it.lineTotal),
                })),
              },
            },
          });

          if (block.kind === 'BILLED') {
            const invoiceNo = await generateInvoiceNo(tx, block.date);
            const totalCgst = resolved.gstSplit.cgst;
            const totalSgst = resolved.gstSplit.sgst;
            const totalIgst = resolved.gstSplit.igst;

            const invoice = await tx.invoice.create({
              data: {
                invoiceNo,
                dispatchEntryId: dispatchEntry.id,
                customerId: customer!.id,
                date: block.date,
                place: city ?? 'N/A',
                totalAmount: new Decimal(block.debitAmount),
                totalCgst: new Decimal(totalCgst),
                totalSgst: new Decimal(totalSgst),
                totalIgst: new Decimal(totalIgst),
                snapshot: {
                  company: { name: 'DigiERP Ink Distributors', state: COMPANY_STATE },
                  customer: { firmName, city, state: customerState },
                  invoice: {
                    invoiceNo,
                    date: block.date.toISOString(),
                    place: city ?? 'N/A',
                    transport: null,
                  },
                  dispatchReference: { challanNo, dispatchDate: block.date.toISOString() },
                  items: items.map((it) => ({
                    productId: it.productId,
                    quantity: it.quantity,
                    unit: 'LTR',
                    price: it.price,
                    cgst: it.cgst,
                    sgst: it.sgst,
                    igst: it.igst,
                    lineTotal: it.lineTotal,
                  })),
                  totals: { totalAmount: block.debitAmount, totalCgst, totalSgst, totalIgst },
                  migration: { source: 'FY2026-27 legacy ledger migration', challanNo },
                },
                items: {
                  create: items.map((it) => ({
                    productId: it.productId,
                    quantity: new Decimal(it.quantity),
                    price: new Decimal(it.price),
                    cgst: new Decimal(it.cgst),
                    sgst: new Decimal(it.sgst),
                    igst: new Decimal(it.igst),
                    lineTotal: new Decimal(it.lineTotal),
                  })),
                },
              },
            });

            await tx.dispatchEntry.update({
              where: { id: dispatchEntry.id },
              data: { status: 'BILLED' },
            });
            await tx.customer.update({
              where: { id: customer!.id },
              data: { outstandingBalance: { increment: block.debitAmount } },
            });
            createdInvoiceIds.push({ invoiceId: invoice.id, date: block.date });
          }
        }

        for (const ctx of sheetContexts) {
          for (const payment of ctx.parsed.payments) {
            const created = await tx.payment.create({
              data: {
                customerId: customer!.id,
                amount: new Decimal(payment.amount),
                unallocatedAmount: new Decimal(payment.amount),
                mode: paymentModeToEnum(payment.mode),
                reference: payment.rawModeText || null,
                date: payment.date,
              },
            });
            await tx.customer.update({
              where: { id: customer!.id },
              data: { creditBalance: { increment: payment.amount } },
            });
            createdPaymentIds.push({
              paymentId: created.id,
              date: payment.date,
              amount: payment.amount,
            });
          }
        }
      },
      { maxWait: 30000, timeout: 60000 }
    );
  } catch (e) {
    report.push({
      customer: customerName,
      status: 'SKIPPED_ERROR',
      detail: `Transaction failed: ${e}`,
    });
    return;
  }

  report.push({ customer: customerName, status: 'COMMITTED' });

  if (createdInvoiceIds.length > 0 && createdPaymentIds.length > 0) {
    // Runs as its own transaction (paymentRepository.allocateBatch manages
    // that internally), separate from the commit above. If it fails, the
    // customer's invoices/payments are still correctly committed - only
    // allocation is missing - so this must not throw and abort the whole
    // script (which would silently skip every remaining customer); it must
    // also not be silently swallowed, since an unallocated customer shows
    // every migrated invoice as UNPAID in the app despite being paid.
    try {
      await allocateOldestUnpaidFirst(customer.id, createdInvoiceIds, createdPaymentIds);
    } catch (e) {
      report.push({
        customer: customerName,
        status: 'COMMITTED_UNALLOCATED',
        detail: `Invoices/payments committed, but payment allocation failed: ${e}. Needs manual allocation.`,
      });
    }
  }
}

async function allocateOldestUnpaidFirst(
  customerId: string,
  invoices: { invoiceId: string; date: Date }[],
  payments: { paymentId: string; date: Date; amount: number }[]
): Promise<void> {
  const sortedInvoices = [...invoices].sort((a, b) => a.date.getTime() - b.date.getTime());
  const sortedPayments = [...payments].sort((a, b) => a.date.getTime() - b.date.getTime());

  const remaining = new Map<string, number>();
  for (const inv of sortedInvoices) {
    const row = await prisma.invoice.findUnique({ where: { id: inv.invoiceId } });
    remaining.set(inv.invoiceId, Number(row!.totalAmount));
  }

  const allocations: { paymentId: string; invoiceId: string; amount: number }[] = [];
  for (const payment of sortedPayments) {
    let left = payment.amount;
    for (const inv of sortedInvoices) {
      if (left <= 0) break;
      const due = remaining.get(inv.invoiceId) ?? 0;
      if (due <= 0) continue;
      const amt = Math.min(left, due);
      allocations.push({ paymentId: payment.paymentId, invoiceId: inv.invoiceId, amount: amt });
      remaining.set(inv.invoiceId, due - amt);
      left -= amt;
    }
  }

  if (allocations.length === 0) return;

  await paymentRepository.allocateBatch({
    idempotencyKey: `${ALLOC_IDEMPOTENCY_PREFIX}-${customerId}`,
    allocations,
  });
}

async function main(): Promise<void> {
  const existingInvoiceCount = await prisma.invoice.count();
  if (existingInvoiceCount > 0) {
    console.error(
      `Pre-flight check failed: ${existingInvoiceCount} Invoice row(s) already exist. ` +
        `This migration assumes no real invoices exist yet - aborting rather than risk ` +
        `interleaving migration invoice numbers with live ones. Investigate before re-running.`
    );
    process.exit(1);
  }

  const printersCategoryId = await ensurePrintersCategory();

  const registry = buildCustomerRegistry();
  for (const ref of registry.values()) {
    await processLedgerCustomer(ref, printersCategoryId);
  }

  // Scope decision: the 3 GST-invoice-only orphan customers and the
  // standalone Rex Tone Industries invoice contain one-off, non-standard
  // line items (e.g. a bare spare-part sale with no ink-taxonomy match) -
  // exactly the pattern the source design docs flag as a manual-review
  // edge case rather than something to auto-categorize. Not auto-migrated
  // in this pass; logged here so they're visible and not silently lost.
  for (const name of [...GST_INVOICE_ONLY_CUSTOMERS, REX_TONE_INDUSTRIES_FOLDER]) {
    report.push({
      customer: name,
      status: 'SKIPPED_ERROR',
      detail:
        'Not auto-migrated - GST-invoice-only customer with non-standard line items, needs manual entry',
    });
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, `fy2026-27-${Date.now()}.json`);
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ report, unmatchedCategoryLog, unparsedRowLog }, null, 2)
  );

  const skipped = report.filter((r) => r.status !== 'COMMITTED' && r.status !== 'ALREADY_MIGRATED');
  console.log(`\nMigration summary: ${report.length} customers processed.`);
  console.log(`  Committed: ${report.filter((r) => r.status === 'COMMITTED').length}`);
  console.log(
    `  Already migrated (skipped): ${report.filter((r) => r.status === 'ALREADY_MIGRATED').length}`
  );
  console.log(`  Skipped (needs review): ${skipped.length}`);
  console.log(`  Report written to: ${reportPath}`);

  if (skipped.length > 0) {
    console.error(`\n${skipped.length} customer(s) skipped - see report for details.`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
