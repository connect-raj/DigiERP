/**
 * Dummy business-data seed. Creates a proportionate set of fake vendors, customers,
 * purchases, dispatch entries, invoices and payments against the catalogue seeded by
 * seed-catalogue.ts, so the app has something to look at in a fresh dev DB.
 *
 * Idempotency strategy: this data has no natural unique keys to upsert on (unlike the
 * catalogue's lookup tables), so instead of trying to upsert we guard the whole block
 * behind `if (await prisma.vendor.count() > 0) skip`. Any prior run of this script (or
 * any real vendor data) short-circuits every subsequent run. This is intentionally
 * coarse — it will also skip if someone has since created real vendors, which is the
 * safe direction to fail in for a "seed some demo data" script.
 *
 * Prefers going through the real service/repository layer (vendorService, customerService,
 * dispatchEntryService, invoiceService, paymentService, plus the same lib/gst.ts,
 * lib/tax-class.ts and lib/purchase-no.ts helpers app/api/purchases/route.ts uses) rather
 * than raw prisma.create calls, so seeded data exercises the same validation and
 * side-effects (GST math, stock transactions, snapshot/printed-name resolution) real
 * usage would. There is no purchase *service* module in this codebase (purchase-creation
 * logic lives directly in app/api/purchases/route.ts) — for purchases this script
 * replicates that route's transaction logic directly, reusing its same underlying lib
 * helpers (generatePurchaseNo, determineGstType, getEffectiveTaxClass, assertHasHsnCode)
 * rather than duplicating the GST math.
 *
 * Run with: npm run seed:dummy
 */
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { vendorService } from '@/services/vendor.service';
import { customerService } from '@/services/customer.service';
import { dispatchEntryService } from '@/services/dispatch-entry.service';
import { invoiceService } from '@/services/invoice.service';
import { paymentService } from '@/services/payment.service';
import { generatePurchaseNo } from '@/lib/purchase-no';
import { determineGstType } from '@/lib/gst';
import { getEffectiveTaxClass, assertHasHsnCode } from '@/lib/tax-class';

// ---- deterministic-ish PRNG so re-reads of this script are easy to reason about ----
let seed = 42;
function rand(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}

const INDIAN_STATES = [
  'Gujarat',
  'Maharashtra',
  'Delhi',
  'Rajasthan',
  'Tamil Nadu',
  'Karnataka',
  'Uttar Pradesh',
  'West Bengal',
  'Madhya Pradesh',
  'Punjab',
];

const STATE_CODES: Record<string, string> = {
  Gujarat: '24',
  Maharashtra: '27',
  Delhi: '07',
  Rajasthan: '08',
  'Tamil Nadu': '33',
  Karnataka: '29',
  'Uttar Pradesh': '09',
  'West Bengal': '19',
  'Madhya Pradesh': '23',
  Punjab: '03',
};

const CITIES: Record<string, string[]> = {
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  Maharashtra: ['Mumbai', 'Pune', 'Nagpur'],
  Delhi: ['New Delhi'],
  Rajasthan: ['Jaipur', 'Jodhpur'],
  'Tamil Nadu': ['Chennai', 'Coimbatore'],
  Karnataka: ['Bengaluru', 'Mysuru'],
  'Uttar Pradesh': ['Lucknow', 'Noida', 'Kanpur'],
  'West Bengal': ['Kolkata', 'Howrah'],
  'Madhya Pradesh': ['Indore', 'Bhopal'],
  Punjab: ['Ludhiana', 'Amritsar'],
};

const VENDOR_NAME_PARTS = [
  'Shree',
  'Sanskar',
  'Vishwa',
  'Ganesh',
  'Om',
  'Krishna',
  'Sai',
  'National',
  'United',
  'Prime',
  'Sunrise',
  'Vardhman',
];
const VENDOR_NAME_SUFFIXES = [
  'Inks & Chemicals',
  'Printing Solutions',
  'Trading Co.',
  'Enterprises',
  'Industries',
  'Digital Supplies',
  'Impex',
  'Corporation',
];

const CUSTOMER_NAME_PARTS = [
  'Aashirwad',
  'Bharat',
  'City',
  'Digital',
  'Elite',
  'Fine',
  'Global',
  'Hi-Tech',
  'Innovative',
  'Jyoti',
  'Kalpana',
  'Metro',
];
const CUSTOMER_NAME_SUFFIXES = [
  'Advertising',
  'Signage Works',
  'Print & Packaging',
  'Graphics',
  'Flex Printers',
  'Visual Solutions',
  'Media Works',
  'Outdoor Ads',
];

function fakeGstin(state: string): string {
  const code = STATE_CODES[state] ?? '24';
  const letters = (n: number) =>
    Array.from({ length: n }, () => String.fromCharCode(65 + randInt(0, 25))).join('');
  const digits = (n: number) => Array.from({ length: n }, () => randInt(0, 9)).join('');
  const alnumPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const alnum = () => alnumPool[randInt(0, alnumPool.length - 1)];
  const entityDigit1to9 = String(randInt(1, 9));

  // Matches the strict GSTIN regex used by validations/customer.ts:
  // ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$
  return `${code}${letters(5)}${digits(4)}${letters(1)}${entityDigit1to9}Z${alnum()}`;
}

function fakePhone(): string {
  return `9${randInt(100000000, 999999999)}`;
}

async function seedVendorsAndCustomers() {
  console.log('Seeding vendors and customers...');

  const vendors = [];
  for (let i = 0; i < 12; i++) {
    const state = pick(INDIAN_STATES);
    const city = pick(CITIES[state]);
    const name = `${pick(VENDOR_NAME_PARTS)} ${pick(VENDOR_NAME_SUFFIXES)}`;
    const vendor = await vendorService.create({
      name,
      phone: fakePhone(),
      address: `${randInt(1, 999)}, ${pick(['Industrial Estate', 'GIDC', 'Market Yard', 'Trade Centre'])}, ${city}`,
      state,
      email: `contact@${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example.com`,
      gstin: fakeGstin(state),
      paymentTerms: pick(['Net 15', 'Net 30', 'Net 45', 'Advance']),
    });
    vendors.push(vendor);
  }

  const customers = [];
  for (let i = 0; i < 12; i++) {
    const state = pick(INDIAN_STATES);
    const city = pick(CITIES[state]);
    const firmName = `${pick(CUSTOMER_NAME_PARTS)} ${pick(CUSTOMER_NAME_SUFFIXES)}`;
    const customer = await customerService.create({
      firmName,
      state,
      contactPerson: `${pick(['Rakesh', 'Suresh', 'Anita', 'Priya', 'Vikram', 'Deepak'])} ${pick(['Shah', 'Patel', 'Mehta', 'Gupta', 'Sharma'])}`,
      address: `${randInt(1, 999)}, ${pick(['Ring Road', 'Station Road', 'MG Road', 'Industrial Area'])}, ${city}`,
      city,
      gstin: fakeGstin(state),
      phone: fakePhone(),
      email: `sales@${firmName.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example.com`,
      creditLimit: pick([50000, 100000, 150000, 200000, 300000]),
      billingMode: 'BILL_WISE',
    });
    customers.push(customer);
  }

  console.log(`Created ${vendors.length} vendors and ${customers.length} customers.`);
  return { vendors, customers };
}

/**
 * Replicates the transaction in app/api/purchases/route.ts's POST handler exactly
 * (same GST/stock logic, via the same lib helpers) since there is no purchase
 * service module to call into directly.
 */
async function createPurchase(params: {
  vendorId: string;
  vendorState: string;
  vendorInvoiceNo: string;
  date: Date;
  items: { productId: string; quantity: number; unitPrice: number }[];
}) {
  const settings = await prisma.settings.findFirstOrThrow();
  const products = await prisma.product.findMany({
    where: { id: { in: params.items.map((i) => i.productId) } },
    include: { taxClass: true, line: { include: { taxClass: true } } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));
  const gstType = determineGstType(settings.companyState, params.vendorState);

  let totalAmount = 0;
  let totalGst = 0;
  const purchaseItemsData = params.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const effectiveTaxClass = getEffectiveTaxClass(product);
    assertHasHsnCode(effectiveTaxClass, product.name);
    const gstRate = Number(effectiveTaxClass.gstRate);
    const itemBaseTotal = item.quantity * item.unitPrice;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    if (gstType === 'CGST_SGST') {
      cgst = (itemBaseTotal * (gstRate / 2)) / 100;
      sgst = (itemBaseTotal * (gstRate / 2)) / 100;
    } else {
      igst = (itemBaseTotal * gstRate) / 100;
    }
    const lineGst = cgst + sgst + igst;
    const lineTotal = itemBaseTotal + lineGst;
    totalGst += lineGst;
    totalAmount += lineTotal;

    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      cgst,
      sgst,
      igst,
      lineTotal,
    };
  });

  const purchaseNo = await generatePurchaseNo();

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const purchase = await tx.purchase.create({
      data: {
        purchaseNo,
        vendorId: params.vendorId,
        vendorInvoiceNo: params.vendorInvoiceNo,
        date: params.date,
        totalAmount,
        totalGst,
        items: { create: purchaseItemsData },
      },
      include: { items: true },
    });

    const stockTxnData = params.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const stockBefore = Number(product.currentStock);
      const stockAfter = stockBefore + item.quantity;
      return {
        productId: item.productId,
        changeQty: item.quantity,
        stockBefore,
        stockAfter,
        reason: 'PURCHASE',
        purchaseId: purchase.id,
      };
    });
    await tx.stockTransaction.createMany({ data: stockTxnData });

    const finalStockByProduct = new Map<string, number>();
    for (const t of stockTxnData) finalStockByProduct.set(t.productId, t.stockAfter);
    for (const [productId, finalStock] of finalStockByProduct) {
      await tx.product.update({ where: { id: productId }, data: { currentStock: finalStock } });
    }

    return purchase;
  });
}

async function main() {
  const existingVendors = await prisma.vendor.count();
  if (existingVendors > 0) {
    console.log(
      `Vendor table already has ${existingVendors} row(s) — dummy-data seed is a no-op (guard: Vendor.count() > 0).`
    );
    return;
  }

  const { vendors, customers } = await seedVendorsAndCustomers();

  const products = await prisma.product.findMany();
  if (products.length === 0) {
    throw new Error('No products found — run `npm run seed:catalogue` first.');
  }

  console.log('Seeding purchases...');
  const purchaseCount = 16;
  let purchaseItemCount = 0;
  const purchaseDate = new Date();
  purchaseDate.setDate(purchaseDate.getDate() - 60);

  for (let i = 0; i < purchaseCount; i++) {
    const vendor = pick(vendors);
    const itemProducts = pickN(products, randInt(1, 2));
    const items = itemProducts.map((p) => ({
      productId: p.id,
      quantity: randInt(50, 150),
      unitPrice: randInt(150, 450),
    }));
    purchaseItemCount += items.length;

    const date = new Date(purchaseDate);
    date.setDate(date.getDate() + i * 2);

    await createPurchase({
      vendorId: vendor.id,
      vendorState: vendor.state,
      vendorInvoiceNo: `VINV-${1000 + i}`,
      date,
      items,
    });
  }
  console.log(`Created ${purchaseCount} purchases with ${purchaseItemCount} purchase items.`);

  console.log('Seeding dispatch entries...');
  const dispatchCount = 16;
  let dispatchItemCount = 0;
  const dispatchEntries: { dispatchEntry: { id: string }; warning?: unknown }[] = [];
  const dispatchDate = new Date();
  dispatchDate.setDate(dispatchDate.getDate() - 30);

  for (let i = 0; i < dispatchCount; i++) {
    const customer = pick(customers);

    // only pick products that currently have enough stock, so we don't hit
    // INSUFFICIENT_STOCK — this queries live DB state, same as the real app would see it.
    const stocked = await prisma.product.findMany({ where: { currentStock: { gt: 10 } } });
    if (stocked.length === 0) break;

    const itemProducts = pickN(stocked, randInt(1, 2));
    const items = itemProducts.map((p) => {
      const available = Number(p.currentStock);
      const qty = Math.min(available, randInt(5, 30));
      return {
        productId: p.id,
        quantity: qty,
        price: randInt(200, 600),
      };
    });
    dispatchItemCount += items.length;

    const date = new Date(dispatchDate);
    date.setDate(date.getDate() + i);

    const result = await dispatchEntryService.create({
      challanNo: `CH-DEMO-${1000 + i}`,
      customerId: customer.id,
      place: pick(CITIES[customer.state] ?? ['Ahmedabad']),
      date: date.toISOString(),
      transport: pick(['By Road', 'Courier', 'Self Pickup', undefined]),
      items,
    });
    dispatchEntries.push(result);
  }
  console.log(`Created ${dispatchEntries.length} dispatch entries with ${dispatchItemCount} items.`);

  console.log('Seeding invoices...');
  const invoices: { id: string; totalAmount: unknown }[] = [];
  const invoiceTargetCount = Math.min(14, dispatchEntries.length);
  for (let i = 0; i < invoiceTargetCount; i++) {
    const { dispatchEntry } = dispatchEntries[i];
    const invoice = await invoiceService.create({ dispatchEntryId: dispatchEntry.id });
    invoices.push(invoice as { id: string; totalAmount: unknown });
  }
  console.log(`Created ${invoices.length} invoices.`);

  console.log('Seeding payments...');
  let paymentCount = 0;
  const paymentTargets = pickN(invoices, Math.min(12, invoices.length));
  const paymentDate = new Date();

  for (let i = 0; i < paymentTargets.length; i++) {
    const invoice = paymentTargets[i];
    const total = Number(invoice.totalAmount);
    // roughly 60% full payment, 40% partial
    const isFull = rand() < 0.6;
    const amount = isFull ? total : Math.round(total * (0.3 + rand() * 0.4));

    const fullInvoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      select: { customerId: true },
    });

    const date = new Date(paymentDate);
    date.setDate(date.getDate() - (paymentTargets.length - i));

    await paymentService.create({
      customerId: fullInvoice.customerId,
      amount,
      mode: pick(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI'] as const),
      date: date.toISOString(),
      reference: `PMT-DEMO-${1000 + i}`,
      allocations: [{ invoiceId: invoice.id, amount }],
    });
    paymentCount++;
  }
  console.log(`Created ${paymentCount} payments.`);

  console.log('Dummy business-data seed complete.');
}

main()
  .catch((e) => {
    console.error('Dummy-data seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
