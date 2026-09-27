-- Guard: this migration assumes Product is empty (no data-migration path is provided).
-- It intentionally fails loudly instead of silently corrupting data if Product has rows.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Product") > 0 THEN
    RAISE EXCEPTION 'Migration aborted: Product table is not empty. This migration removes Category and reshapes Product with no data-migration path; back up and empty Product before running it.';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('INK', 'MACHINE', 'SPARE_PART');

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropIndex
DROP INDEX "Product_categoryId_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "categoryId",
DROP COLUMN "unit",
ADD COLUMN     "colourId" TEXT,
ADD COLUMN     "lineId" TEXT NOT NULL,
ADD COLUMN     "packSize" DECIMAL(12,3),
ADD COLUMN     "specs" JSONB,
ADD COLUMN     "taxClassId" TEXT,
ADD COLUMN     "unitId" TEXT NOT NULL,
ALTER COLUMN "basePrice" SET DEFAULT 0;

-- DropTable
DROP TABLE "Category";

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technology" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Technology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Format" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Format_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "usesColours" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LineRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Colour" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Colour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColourSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ColourSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColourSetColour" (
    "colourSetId" TEXT NOT NULL,
    "colourId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ColourSetColour_pkey" PRIMARY KEY ("colourSetId","colourId")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "appliesTo" "ProductKind"[],

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxClass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hsnCode" TEXT,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaxClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Printhead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dropSizePl" DECIMAL(6,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Printhead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLine" (
    "id" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brandId" TEXT,
    "technologyId" TEXT,
    "formatId" TEXT,
    "roleId" TEXT,
    "colourSetId" TEXT,
    "taxClassId" TEXT NOT NULL,
    "invoiceName" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineHead" (
    "lineId" TEXT NOT NULL,
    "printheadId" TEXT NOT NULL,

    CONSTRAINT "LineHead_pkey" PRIMARY KEY ("lineId","printheadId")
);

-- CreateTable
CREATE TABLE "CustomerLineInvoiceName" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CustomerLineInvoiceName_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Technology_name_key" ON "Technology"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Format_name_key" ON "Format"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LineRole_name_key" ON "LineRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Colour_name_key" ON "Colour"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ColourSet_name_key" ON "ColourSet"("name");

-- CreateIndex
CREATE INDEX "ColourSetColour_colourId_idx" ON "ColourSetColour"("colourId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_key" ON "Unit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TaxClass_name_key" ON "TaxClass"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Printhead_name_key" ON "Printhead"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLine_name_key" ON "ProductLine"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLine_slug_key" ON "ProductLine"("slug");

-- CreateIndex
CREATE INDEX "ProductLine_brandId_idx" ON "ProductLine"("brandId");

-- CreateIndex
CREATE INDEX "ProductLine_technologyId_idx" ON "ProductLine"("technologyId");

-- CreateIndex
CREATE INDEX "ProductLine_formatId_idx" ON "ProductLine"("formatId");

-- CreateIndex
CREATE INDEX "ProductLine_roleId_idx" ON "ProductLine"("roleId");

-- CreateIndex
CREATE INDEX "ProductLine_colourSetId_idx" ON "ProductLine"("colourSetId");

-- CreateIndex
CREATE INDEX "ProductLine_taxClassId_idx" ON "ProductLine"("taxClassId");

-- CreateIndex
CREATE INDEX "LineHead_printheadId_idx" ON "LineHead"("printheadId");

-- CreateIndex
CREATE INDEX "CustomerLineInvoiceName_lineId_idx" ON "CustomerLineInvoiceName"("lineId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLineInvoiceName_customerId_lineId_key" ON "CustomerLineInvoiceName"("customerId", "lineId");

-- CreateIndex
CREATE INDEX "Product_lineId_idx" ON "Product"("lineId");

-- CreateIndex
CREATE INDEX "Product_unitId_idx" ON "Product"("unitId");

-- CreateIndex
CREATE INDEX "Product_colourId_idx" ON "Product"("colourId");

-- CreateIndex
CREATE INDEX "Product_taxClassId_idx" ON "Product"("taxClassId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_lineId_name_key" ON "Product"("lineId", "name");

-- AddForeignKey
ALTER TABLE "ColourSetColour" ADD CONSTRAINT "ColourSetColour_colourSetId_fkey" FOREIGN KEY ("colourSetId") REFERENCES "ColourSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColourSetColour" ADD CONSTRAINT "ColourSetColour_colourId_fkey" FOREIGN KEY ("colourId") REFERENCES "Colour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLine" ADD CONSTRAINT "ProductLine_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLine" ADD CONSTRAINT "ProductLine_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLine" ADD CONSTRAINT "ProductLine_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "Format"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLine" ADD CONSTRAINT "ProductLine_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "LineRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLine" ADD CONSTRAINT "ProductLine_colourSetId_fkey" FOREIGN KEY ("colourSetId") REFERENCES "ColourSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLine" ADD CONSTRAINT "ProductLine_taxClassId_fkey" FOREIGN KEY ("taxClassId") REFERENCES "TaxClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineHead" ADD CONSTRAINT "LineHead_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineHead" ADD CONSTRAINT "LineHead_printheadId_fkey" FOREIGN KEY ("printheadId") REFERENCES "Printhead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_colourId_fkey" FOREIGN KEY ("colourId") REFERENCES "Colour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_taxClassId_fkey" FOREIGN KEY ("taxClassId") REFERENCES "TaxClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLineInvoiceName" ADD CONSTRAINT "CustomerLineInvoiceName_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLineInvoiceName" ADD CONSTRAINT "CustomerLineInvoiceName_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

