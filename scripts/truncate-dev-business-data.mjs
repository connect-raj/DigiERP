// One-off dev DB reset: wipe all business/transactional data so the catalogue
// migration's empty-Product guard can run, then commit 12 reseeds everything.
// Keeps: User, Settings, Inquiry (rows kept, convertedCustomerId cleared), IngestionApiKey.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.inquiry.updateMany({
      where: { convertedCustomerId: { not: null } },
      data: { convertedCustomerId: null },
    }),
    prisma.paymentAllocation.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.vendorPayment.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.dispatchEntryItem.deleteMany(),
    prisma.stockTransaction.deleteMany(),
    prisma.dispatchEntry.deleteMany(),
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.priceHistory.deleteMany(),
    prisma.customerPrice.deleteMany(),
    prisma.vendorProduct.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.vendor.deleteMany(),
  ]);
  console.log('Dev DB business data truncated.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
