-- CreateEnum
CREATE TYPE "InquirySource" AS ENUM ('WEBSITE', 'EXPO', 'INDIAMART', 'TRADEINDIA', 'MANUAL');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "InquiryInterest" AS ENUM ('INK', 'LARGE_FORMAT_PRINTER', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "InkType" AS ENUM ('UV', 'SOLVENT', 'ECO_SOLVENT');

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "source" "InquirySource" NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "company" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT,
    "interestCategory" "InquiryInterest" NOT NULL,
    "inkType" "InkType",
    "volume" TEXT,
    "printerBrand" TEXT,
    "currentSupplier" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "convertedCustomerId" TEXT,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionApiKey" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source" "InquirySource" NOT NULL,
    "keyHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestionApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");

-- CreateIndex
CREATE INDEX "Inquiry_source_idx" ON "Inquiry"("source");

-- CreateIndex
CREATE INDEX "Inquiry_phone_idx" ON "Inquiry"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "IngestionApiKey_keyHash_key" ON "IngestionApiKey"("keyHash");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_convertedCustomerId_fkey" FOREIGN KEY ("convertedCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
