/*
  Warnings:

  - You are about to drop the column `creditBalance` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `outstandingBalance` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `unallocatedAmount` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `batchId` on the `PaymentAllocation` table. All the data in the column will be lost.
  - You are about to drop the `AllocationBatch` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('BILL_WISE', 'OPEN_BALANCE');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('STANDARD', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'VOID');

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_dispatchEntryId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentAllocation" DROP CONSTRAINT "PaymentAllocation_batchId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentAllocation" DROP CONSTRAINT "PaymentAllocation_invoiceId_fkey";

-- DropIndex
DROP INDEX "Invoice_paymentStatus_idx";

-- DropIndex
DROP INDEX "PaymentAllocation_batchId_idx";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "creditBalance",
DROP COLUMN "outstandingBalance",
ADD COLUMN     "billingMode" "BillingMode" NOT NULL DEFAULT 'BILL_WISE';

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "paidAmount",
DROP COLUMN "paymentStatus",
ADD COLUMN     "asOfDate" TIMESTAMP(3),
ADD COLUMN     "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "type" "InvoiceType" NOT NULL DEFAULT 'STANDARD',
ALTER COLUMN "invoiceNo" DROP NOT NULL,
ALTER COLUMN "dispatchEntryId" DROP NOT NULL,
ALTER COLUMN "place" DROP NOT NULL,
ALTER COLUMN "snapshot" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "unallocatedAmount",
ADD COLUMN     "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "PaymentAllocation" DROP COLUMN "batchId",
ADD COLUMN     "note" TEXT,
ALTER COLUMN "invoiceId" DROP NOT NULL;

-- DropTable
DROP TABLE "AllocationBatch";

-- CreateIndex
CREATE INDEX "Invoice_type_idx" ON "Invoice"("type");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_dispatchEntryId_fkey" FOREIGN KEY ("dispatchEntryId") REFERENCES "DispatchEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
