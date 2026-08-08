import { Prisma } from '@prisma/client';

export async function generateInvoiceNo(
  tx: Prisma.TransactionClient,
  invoiceDate: Date
): Promise<string> {
  const year = invoiceDate.getFullYear();
  const month = invoiceDate.getMonth(); // 0-indexed; April = 3

  const fyStart = month >= 3 ? year : year - 1;
  const fyEnd = fyStart + 1;
  const fyString = `${fyStart.toString().slice(-2)}${fyEnd.toString().slice(-2)}`;
  const prefix = `INV-${fyString}-`;

  // Serialize concurrent invoice creation within the same financial year — without this,
  // two transactions could both read "no invoices yet" and both generate 001.
  // $executeRaw (not $queryRaw) because pg_advisory_xact_lock returns void, which
  // Prisma cannot deserialize as a query result.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;

  const latestInvoice = await tx.invoice.findFirst({
    where: { invoiceNo: { startsWith: prefix } },
    orderBy: { invoiceNo: 'desc' },
  });

  let nextNumber = 1;
  if (latestInvoice?.invoiceNo) {
    const parts = latestInvoice.invoiceNo.split('-');
    const lastNumberStr = parts[parts.length - 1];
    nextNumber = parseInt(lastNumberStr, 10) + 1;
  }

  const paddedNumber = nextNumber.toString().padStart(3, '0');
  return `${prefix}${paddedNumber}`;
}
