/**
 * Dummy data seed for local/demo use — NOT the canonical seed (that stays admin-only).
 * Run with:  npx tsx prisma/dummy-seed.ts
 *
 * Produces 10+ records for every business entity and exercises the derived-balance payment
 * model: bill-wise full/partial payments, the ₹8,000 machine+on-account split, pure on-account
 * credit, opening balances, and a voided payment. No balances are stored — they derive from
 * these Payment/PaymentAllocation/Invoice rows.
 */
import prisma from '@/lib/prisma';
import { COMPANY_STATE } from '@/lib/constants';
import { determineGstType } from '@/lib/gst';
import { hashPassword } from '@/lib/auth-utils';
import { InvoiceType, RecordStatus, PaymentMode, DocStatus } from '@prisma/client';

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const d = (iso: string) => new Date(iso);

async function main() {
  console.log('Dummy seed starting...');

  // ---- Settings (singleton) ----
  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        companyName: 'DigiERP Ink Distributors',
        companyAddress: 'Plot 18, GIDC Estate, Ahmedabad, Gujarat',
        companyState: COMPANY_STATE,
        companyGstin: '24AAAAA0000A1Z5',
        companyPan: 'AAAAA0000A',
      },
    });
  }

  // ---- Users (10) ----
  const usernames = [
    'admin',
    'ravi.ops',
    'meena.accounts',
    'arjun.sales',
    'priya.dispatch',
    'karan.billing',
    'sana.store',
    'dev.audit',
    'nina.support',
    'omar.manager',
  ];
  const users = [];
  for (const username of usernames) {
    const existing = await prisma.user.findUnique({ where: { username } });
    users.push(
      existing ??
        (await prisma.user.create({
          data: {
            username,
            passwordHash: hashPassword('Admin@123'),
            role: username === 'admin' ? 'admin' : 'user',
          },
        }))
    );
  }
  const adminId = users[0].id;

  // ---- Categories (12) ----
  const categoryDefs = [
    ['Solvent Ink', '32151900', 18],
    ['Eco-Solvent Ink', '32151900', 18],
    ['UV Curable Ink', '32151100', 18],
    ['Sublimation Ink', '32151900', 12],
    ['Latex Ink', '32151900', 18],
    ['Flex Media', '39209999', 18],
    ['Vinyl Media', '39199090', 18],
    ['Cleaning Solution', '38140010', 18],
    ['Printheads', '84439990', 18],
    ['Laminate Film', '39199090', 12],
    ['Backlit Film', '39209999', 18],
    ['Coldset Ink', '32151900', 5],
  ];
  const categories = [];
  for (const [name, hsnCode, gstRate] of categoryDefs) {
    categories.push(
      await prisma.category.create({
        data: { name: name as string, hsnCode: hsnCode as string, gstRate: gstRate as number },
      })
    );
  }

  // ---- Products (15) ----
  const productDefs: [string, number, number, string][] = [
    ['Solvent Ink Cyan 1L', 0, 950, 'LTR'],
    ['Solvent Ink Magenta 1L', 0, 950, 'LTR'],
    ['Solvent Ink Yellow 1L', 0, 950, 'LTR'],
    ['Solvent Ink Black 1L', 0, 900, 'LTR'],
    ['Eco-Solvent Ink Cyan 1L', 1, 1350, 'LTR'],
    ['Eco-Solvent Ink Black 1L', 1, 1300, 'LTR'],
    ['UV Ink White 1L', 2, 2400, 'LTR'],
    ['UV Ink Clear 1L', 2, 2600, 'LTR'],
    ['Sublimation Ink Blue 1L', 3, 1150, 'LTR'],
    ['Latex Ink Cyan 775ml', 4, 3200, 'PCS'],
    ['Flex Banner 10oz (sqm)', 5, 45, 'SQM'],
    ['Vinyl Gloss (sqm)', 6, 65, 'SQM'],
    ['Head Cleaning Solution 1L', 7, 480, 'LTR'],
    ['DX5 Printhead', 8, 18500, 'PCS'],
    ['Cold Laminate Film (roll)', 9, 2200, 'PCS'],
  ];
  const products = [];
  for (const [name, catIdx, basePrice, unit] of productDefs) {
    products.push(
      await prisma.product.create({
        data: {
          name,
          categoryId: categories[catIdx].id,
          basePrice,
          unit,
          currentStock: 400,
          lowerStockLimit: 50,
        },
      })
    );
  }

  // ---- Vendors (12) ----
  const vendorDefs: [string, string, string][] = [
    ['Gujarat Ink Supplies', 'Gujarat', '24AABCG1234A1Z2'],
    ['Rajkot Chemicals', 'Gujarat', '24AACCR5678B1Z9'],
    ['Mumbai Media House', 'Maharashtra', '27AAECM9012C1Z1'],
    ['Delhi Printhead Co', 'Delhi', '07AAACD3456D1Z5'],
    ['Chennai Coatings', 'Tamil Nadu', '33AAGCC7890E1Z3'],
    ['Surat Vinyl Traders', 'Gujarat', '24AAFCS2345F1Z7'],
    ['Pune Solvents Ltd', 'Maharashtra', '27AAHCP6789G1Z0'],
    ['Kolkata Films', 'West Bengal', '19AAJCK1122H1Z4'],
    ['Bengaluru UV Systems', 'Karnataka', '29AAKCB3344I1Z8'],
    ['Ahmedabad Ink Depot', 'Gujarat', '24AALCA5566J1Z2'],
    ['Indore Media Mart', 'Madhya Pradesh', '23AAMCI7788K1Z6'],
    ['Jaipur Print Supplies', 'Rajasthan', '08AANCJ9900L1Z1'],
  ];
  const vendors = [];
  for (let i = 0; i < vendorDefs.length; i++) {
    const [name, state, gstin] = vendorDefs[i];
    vendors.push(
      await prisma.vendor.create({
        data: {
          name,
          state,
          gstin,
          phone: `98${String(10000000 + i * 111111).slice(0, 8)}`,
          address: `${name} Warehouse, ${state}`,
          email: `sales@${name.toLowerCase().replace(/[^a-z]/g, '')}.example`,
          paymentTerms: i % 2 === 0 ? 'Net 30' : 'Net 15',
        },
      })
    );
  }

  // ---- VendorProducts (link each product to 1-2 vendors) ----
  for (let i = 0; i < products.length; i++) {
    await prisma.vendorProduct.create({
      data: { vendorId: vendors[i % vendors.length].id, productId: products[i].id, isPreferred: true },
    });
    await prisma.vendorProduct.create({
      data: {
        vendorId: vendors[(i + 3) % vendors.length].id,
        productId: products[i].id,
        isPreferred: false,
      },
    });
  }

  // ---- Customers (12): 8 BILL_WISE, 4 OPEN_BALANCE ----
  const customerDefs: [string, string, string, string, number][] = [
    ['Shree Ganesh Printers', 'Ahmedabad', 'Gujarat', '24AABCS1111A1Z1', 200000],
    ['Krishna Digital', 'Surat', 'Gujarat', '24AACCK2222B1Z2', 150000],
    ['Metro Signage', 'Mumbai', 'Maharashtra', '27AAECM3333C1Z3', 300000],
    ['Royal Flex House', 'Rajkot', 'Gujarat', '24AAFCR4444D1Z4', 100000],
    ['Sunrise Advertising', 'Pune', 'Maharashtra', '27AAHCS5555E1Z5', 250000],
    ['Galaxy Prints', 'Vadodara', 'Gujarat', '24AAJCG6666F1Z6', 120000],
    ['Star Media Works', 'Delhi', 'Delhi', '07AAKCS7777G1Z7', 400000],
    ['Bright Banner Co', 'Ahmedabad', 'Gujarat', '24AALCB8888H1Z8', 90000],
    ['Heritage Signs', 'Jaipur', 'Rajasthan', '08AAMCH9999I1Z9', 180000],
    ['Unity Graphics', 'Indore', 'Madhya Pradesh', '23AANCU1010J1Z0', 160000],
    ['Pioneer Digital', 'Surat', 'Gujarat', '24AAOCP1212K1Z1', 140000],
    ['Skyline Displays', 'Bengaluru', 'Karnataka', '29AAPCS1313L1Z2', 220000],
  ];
  const customers = [];
  for (let i = 0; i < customerDefs.length; i++) {
    const [firmName, city, state, gstin, creditLimit] = customerDefs[i];
    customers.push(
      await prisma.customer.create({
        data: {
          firmName,
          city,
          state,
          gstin,
          creditLimit,
          contactPerson: `Contact ${i + 1}`,
          phone: `97${String(20000000 + i * 121212).slice(0, 8)}`,
          email: `accounts@${firmName.toLowerCase().replace(/[^a-z]/g, '')}.example`,
          address: `${firmName}, ${city}`,
          billingMode: i >= 8 ? 'OPEN_BALANCE' : 'BILL_WISE',
        },
      })
    );
  }

  // ---- Manual CustomerPrices + PriceHistory (12) ----
  for (let i = 0; i < customers.length; i++) {
    const product = products[i % products.length];
    const price = r2(Number(product.basePrice) * 0.95);
    await prisma.customerPrice.create({
      data: { customerId: customers[i].id, productId: product.id, price, isManual: true },
    });
    await prisma.priceHistory.create({
      data: { customerId: customers[i].id, productId: product.id, price, source: 'MANUAL' },
    });
  }

  // ---- Purchases (12) with items + stock-in + vendor payments ----
  let poCounter = 1;
  for (let i = 0; i < 12; i++) {
    const vendor = vendors[i];
    const gstType = determineGstType(settings.companyState, vendor.state);
    const items = [products[i % products.length], products[(i + 5) % products.length]].map((p) => {
      const quantity = r3(20 + i * 2);
      const unitPrice = r2(Number(p.basePrice) * 0.7);
      const cat = categories.find((c) => c.id === p.categoryId)!;
      const rate = Number(cat.gstRate);
      const base = unitPrice * quantity;
      const cgst = gstType === 'CGST_SGST' ? r2((base * rate) / 200) : 0;
      const sgst = cgst;
      const igst = gstType === 'IGST' ? r2((base * rate) / 100) : 0;
      return {
        productId: p.id,
        quantity,
        unitPrice,
        cgst,
        sgst,
        igst,
        lineTotal: r2(base + cgst + sgst + igst),
      };
    });
    const totalAmount = r2(items.reduce((s, it) => s + it.lineTotal, 0));
    const totalGst = r2(items.reduce((s, it) => s + it.cgst + it.sgst + it.igst, 0));
    const received = i % 4 !== 0; // 3 of 4 received

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNo: `PO-2627-${String(poCounter++).padStart(4, '0')}`,
        vendorId: vendor.id,
        vendorInvoiceNo: `VINV-${1000 + i}`,
        date: d(`2026-0${(i % 6) + 4}-1${i % 9}`.replace('010', '10')),
        totalAmount,
        totalGst,
        expectedDeliveryDate: d('2026-09-01'),
        receivedDate: received ? d('2026-08-05') : null,
        paidAmount: 0,
        items: { create: items },
      },
    });

    if (received) {
      for (const it of items) {
        await prisma.product.update({
          where: { id: it.productId },
          data: { currentStock: { increment: it.quantity } },
        });
        const prod = await prisma.product.findUnique({ where: { id: it.productId } });
        await prisma.stockTransaction.create({
          data: {
            productId: it.productId,
            changeQty: it.quantity,
            stockBefore: r3(Number(prod!.currentStock) - Number(it.quantity)),
            stockAfter: Number(prod!.currentStock),
            reason: 'PURCHASE',
            purchaseId: purchase.id,
            performedById: adminId,
          },
        });
      }
    }

    // Vendor payment(s) — some full, some partial, one unpaid
    if (i % 5 !== 0) {
      const payAmt = i % 3 === 0 ? r2(totalAmount * 0.5) : totalAmount;
      await prisma.vendorPayment.create({
        data: {
          vendorId: vendor.id,
          purchaseId: purchase.id,
          amount: payAmt,
          mode: PaymentMode.BANK_TRANSFER,
          reference: `VPAY-${2000 + i}`,
          date: d('2026-08-06'),
          recordedById: adminId,
        },
      });
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          paidAmount: payAmt,
          paymentStatus: payAmt >= totalAmount ? 'PAID' : 'PARTIAL',
        },
      });
    }
  }

  // ---- Dispatch entries + STANDARD invoices ----
  // 12 billed (→ invoiced) + 2 pending-billing = 14 dispatch entries.
  let chCounter = 1;
  let invCounter = 1;
  const createdInvoices: { id: string; customerId: string; totalAmount: number; date: Date }[] = [];

  for (let i = 0; i < 14; i++) {
    const customer = customers[i % customers.length];
    const gstType = determineGstType(settings.companyState, customer.state);
    const lineProducts = [products[i % products.length], products[(i + 4) % products.length]];

    const itemInputs = lineProducts.map((p, j) => {
      const quantity = r3(5 + i + j);
      const price = r2(Number(p.basePrice));
      const cat = categories.find((c) => c.id === p.categoryId)!;
      const rate = Number(cat.gstRate);
      const base = price * quantity;
      const cgst = gstType === 'CGST_SGST' ? r2((base * rate) / 200) : 0;
      const sgst = cgst;
      const igst = gstType === 'IGST' ? r2((base * rate) / 100) : 0;
      return {
        product: p,
        category: cat,
        quantity,
        price,
        cgst,
        sgst,
        igst,
        lineTotal: r2(base + cgst + sgst + igst),
      };
    });

    const totalAmount = r2(itemInputs.reduce((s, it) => s + it.lineTotal, 0));
    const totalCgst = r2(itemInputs.reduce((s, it) => s + it.cgst, 0));
    const totalSgst = r2(itemInputs.reduce((s, it) => s + it.sgst, 0));
    const totalIgst = r2(itemInputs.reduce((s, it) => s + it.igst, 0));
    const billed = i < 12;
    const dispatchDate = d(`2026-0${(i % 5) + 4}-2${i % 8}`.replace('020', '20'));

    const dispatch = await prisma.dispatchEntry.create({
      data: {
        challanNo: `CH-2627-${String(chCounter++).padStart(4, '0')}`,
        customerId: customer.id,
        place: customer.city ?? 'Ahmedabad',
        transport: i % 2 === 0 ? 'VRL Logistics' : 'Gati',
        date: dispatchDate,
        status: billed ? DocStatus.BILLED : DocStatus.PENDING_BILLING,
        totalAmount: r2(itemInputs.reduce((s, it) => s + it.price * it.quantity, 0)),
        items: {
          create: itemInputs.map((it) => ({
            productId: it.product.id,
            quantity: it.quantity,
            price: it.price,
            lineTotal: r2(it.price * it.quantity),
          })),
        },
      },
    });

    // stock-out for dispatched goods
    for (const it of itemInputs) {
      await prisma.product.update({
        where: { id: it.product.id },
        data: { currentStock: { decrement: it.quantity } },
      });
      const prod = await prisma.product.findUnique({ where: { id: it.product.id } });
      await prisma.stockTransaction.create({
        data: {
          productId: it.product.id,
          changeQty: r3(-Number(it.quantity)),
          stockBefore: r3(Number(prod!.currentStock) + Number(it.quantity)),
          stockAfter: Number(prod!.currentStock),
          reason: 'DISPATCH',
          dispatchEntryId: dispatch.id,
          performedById: adminId,
        },
      });
    }

    if (billed) {
      const invoiceNo = `INV-2627-${String(invCounter++).padStart(4, '0')}`;
      const snapshot = {
        company: {
          name: settings.companyName,
          address: settings.companyAddress,
          state: settings.companyState,
          gstin: settings.companyGstin,
          pan: settings.companyPan,
        },
        customer: {
          firmName: customer.firmName,
          address: customer.address ?? '',
          city: customer.city ?? '',
          state: customer.state,
          gstin: customer.gstin,
        },
        invoice: {
          invoiceNo,
          date: dispatchDate.toISOString(),
          place: customer.city ?? 'Ahmedabad',
          transport: dispatch.transport,
        },
        dispatchReference: { challanNo: dispatch.challanNo, dispatchDate: dispatchDate.toISOString() },
        items: itemInputs.map((it) => ({
          productName: it.product.name,
          categoryName: it.category.name,
          hsnCode: it.category.hsnCode,
          quantity: it.quantity,
          unit: it.product.unit,
          price: it.price,
          cgst: it.cgst,
          sgst: it.sgst,
          igst: it.igst,
          lineTotal: it.lineTotal,
        })),
        totals: { totalAmount, totalCgst, totalSgst, totalIgst },
      };

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNo,
          dispatchEntryId: dispatch.id,
          customerId: customer.id,
          type: InvoiceType.STANDARD,
          status: RecordStatus.ACTIVE,
          date: dispatchDate,
          place: customer.city ?? 'Ahmedabad',
          transport: dispatch.transport,
          totalAmount,
          totalCgst,
          totalSgst,
          totalIgst,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          snapshot: snapshot as any,
          items: {
            create: itemInputs.map((it) => ({
              productId: it.product.id,
              quantity: it.quantity,
              price: it.price,
              cgst: it.cgst,
              sgst: it.sgst,
              igst: it.igst,
              lineTotal: it.lineTotal,
            })),
          },
        },
      });
      createdInvoices.push({
        id: invoice.id,
        customerId: customer.id,
        totalAmount,
        date: dispatchDate,
      });
    }
  }

  // ---- Opening balances for OPEN_BALANCE customers (4) ----
  for (let i = 8; i < customers.length; i++) {
    await prisma.invoice.create({
      data: {
        customerId: customers[i].id,
        type: InvoiceType.OPENING_BALANCE,
        status: RecordStatus.ACTIVE,
        totalAmount: r2(25000 + i * 5000),
        date: d('2026-04-01'),
        asOfDate: d('2026-04-01'),
      },
    });
  }

  // ---- Payments + allocations (derived-balance scenarios) ----
  // Group invoices by customer for allocation.
  const invByCustomer = new Map<string, typeof createdInvoices>();
  for (const inv of createdInvoices) {
    const list = invByCustomer.get(inv.customerId) ?? [];
    list.push(inv);
    invByCustomer.set(inv.customerId, list);
  }

  const modes: PaymentMode[] = [
    PaymentMode.BANK_TRANSFER,
    PaymentMode.UPI,
    PaymentMode.CASH,
    PaymentMode.CHEQUE,
  ];
  let payCount = 0;
  let scenarioIdx = 0;

  for (const customer of customers) {
    const invs = invByCustomer.get(customer.id) ?? [];
    const mode = modes[scenarioIdx % modes.length];
    const payDate = d('2026-08-07');

    if (customer.billingMode === 'OPEN_BALANCE') {
      // pure on-account credit against the running balance
      await prisma.payment.create({
        data: {
          customerId: customer.id,
          amount: r2(10000 + scenarioIdx * 1500),
          mode,
          reference: `PAY-${5000 + payCount}`,
          date: payDate,
          recordedById: adminId,
          allocations: { create: [{ invoiceId: null, amount: r2(10000 + scenarioIdx * 1500) }] },
        },
      });
      payCount++;
    } else if (invs.length > 0) {
      const first = invs[0];
      const scenario = scenarioIdx % 4;
      if (scenario === 0) {
        // fully paid
        await prisma.payment.create({
          data: {
            customerId: customer.id,
            amount: first.totalAmount,
            mode,
            reference: `PAY-${5000 + payCount}`,
            date: payDate,
            recordedById: adminId,
            allocations: { create: [{ invoiceId: first.id, amount: first.totalAmount }] },
          },
        });
      } else if (scenario === 1) {
        // partial payment
        await prisma.payment.create({
          data: {
            customerId: customer.id,
            amount: r2(first.totalAmount * 0.4),
            mode,
            reference: `PAY-${5000 + payCount}`,
            date: payDate,
            recordedById: adminId,
            allocations: { create: [{ invoiceId: first.id, amount: r2(first.totalAmount * 0.4) }] },
          },
        });
      } else if (scenario === 2) {
        // split: part to the invoice, remainder on-account
        const toInvoice = r2(first.totalAmount * 0.5);
        const onAccount = 6000;
        await prisma.payment.create({
          data: {
            customerId: customer.id,
            amount: r2(toInvoice + onAccount),
            mode,
            reference: `PAY-${5000 + payCount}`,
            date: payDate,
            recordedById: adminId,
            allocations: {
              create: [
                { invoiceId: first.id, amount: toInvoice, note: 'Applied to invoice' },
                { invoiceId: null, amount: onAccount, note: 'On account credit' },
              ],
            },
          },
        });
      } else {
        // a voided payment (kept for audit; excluded from balances)
        await prisma.payment.create({
          data: {
            customerId: customer.id,
            amount: first.totalAmount,
            mode,
            reference: `PAY-${5000 + payCount}-VOID`,
            date: payDate,
            status: RecordStatus.VOID,
            recordedById: adminId,
            allocations: { create: [{ invoiceId: first.id, amount: first.totalAmount }] },
          },
        });
      }
      payCount++;
    }
    scenarioIdx++;
  }

  // A couple of extra standalone on-account payments to push Payment count past 10 comfortably.
  for (let i = 0; i < 3; i++) {
    await prisma.payment.create({
      data: {
        customerId: customers[i].id,
        amount: r2(5000 + i * 1000),
        mode: PaymentMode.UPI,
        reference: `PAY-ADV-${i + 1}`,
        date: d('2026-08-08'),
        recordedById: adminId,
        allocations: { create: [{ invoiceId: null, amount: r2(5000 + i * 1000) }] },
      },
    });
    payCount++;
  }

  // ---- Summary ----
  const counts = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    vendors: await prisma.vendor.count(),
    vendorProducts: await prisma.vendorProduct.count(),
    customers: await prisma.customer.count(),
    customerPrices: await prisma.customerPrice.count(),
    priceHistory: await prisma.priceHistory.count(),
    purchases: await prisma.purchase.count(),
    purchaseItems: await prisma.purchaseItem.count(),
    vendorPayments: await prisma.vendorPayment.count(),
    dispatchEntries: await prisma.dispatchEntry.count(),
    dispatchItems: await prisma.dispatchEntryItem.count(),
    invoices: await prisma.invoice.count(),
    invoiceItems: await prisma.invoiceItem.count(),
    payments: await prisma.payment.count(),
    paymentAllocations: await prisma.paymentAllocation.count(),
    stockTransactions: await prisma.stockTransaction.count(),
  };
  console.table(counts);
  console.log('Dummy seed complete.');
}

main()
  .catch((e) => {
    console.error('Dummy seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
