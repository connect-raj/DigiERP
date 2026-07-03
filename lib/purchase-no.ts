import prisma from './prisma';

export async function generatePurchaseNo(): Promise<string> {
  const now = new Date();
  let financialYearStart = now.getFullYear();
  let financialYearEnd = financialYearStart + 1;

  if (now.getMonth() < 3) {
    financialYearStart -= 1;
    financialYearEnd -= 1;
  }

  const fyString = `${financialYearStart.toString().slice(-2)}${financialYearEnd.toString().slice(-2)}`;
  const prefix = `PUR-${fyString}-`;

  const latestPurchase = await prisma.purchase.findFirst({
    where: {
      purchaseNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      purchaseNo: 'desc',
    },
  });

  let nextNumber = 1;
  if (latestPurchase) {
    const parts = latestPurchase.purchaseNo.split('-');
    const lastNumberStr = parts[parts.length - 1];
    nextNumber = parseInt(lastNumberStr, 10) + 1;
  }

  const paddedNumber = nextNumber.toString().padStart(3, '0');
  return `${prefix}${paddedNumber}`;
}
