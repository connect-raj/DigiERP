import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { COMPANY_STATE } from '@/lib/constants';
import { hashPassword } from '@/lib/auth-utils';

interface CategorySeed {
  name: string;
  hsnCode: string;
  gstRate: number;
}

// Placeholder categories from Sprint 1 development, superseded by the
// historical-ledger-derived taxonomy below (see
// docs/migration/digierp-legacy-category-proposal.md). Removed if no
// Product still references them.
const LEGACY_PLACEHOLDER_CATEGORY_NAMES = [
  'Konica 512i Solvent Ink',
  'Konica 1024i Solvent Ink',
  'Eco Solvent Ink',
  'UV Ink',
  'Solvent Flush',
  'UV Flush',
  'UV Varnish',
];

// Brand x Printhead x Ink-Type taxonomy, built from 349 historical ink
// ledger files. See docs/migration/digierp-legacy-category-proposal.md
// for the full derivation and locked decisions.
const categories: CategorySeed[] = [
  // Platinum
  { name: 'Platinum Konica 512i Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Platinum Konica 512i Solvent Flush', hsnCode: '3820', gstRate: 18 },
  { name: 'Platinum Konica 1024i Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Platinum Konica 1024i Solvent Flush', hsnCode: '3820', gstRate: 18 },
  { name: 'Platinum Xaar Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Platinum Xaar Solvent Flush', hsnCode: '3820', gstRate: 18 },
  { name: 'Platinum Eco Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Platinum Eco Solvent Flush', hsnCode: '3820', gstRate: 18 },
  { name: 'Platinum Solvent Ink', hsnCode: '3215', gstRate: 18 },
  // Premium
  { name: 'Premium Konica Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Premium Konica Solvent Flush', hsnCode: '3820', gstRate: 18 },
  { name: 'Premium Xaar Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Premium Xaar Solvent Flush', hsnCode: '3820', gstRate: 18 },
  { name: 'Premium Solvent Ink', hsnCode: '3215', gstRate: 18 },
  // Max
  { name: 'Max Konica Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Max Konica 1024i Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Max Solvent Ink', hsnCode: '3215', gstRate: 18 },
  // Allwin
  { name: 'Allwin Eco Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Allwin Konica Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Allwin Konica 512i Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Allwin UV Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Allwin UV Soft Ink', hsnCode: '3215', gstRate: 18 },
  // Toyo
  { name: 'Toyo Ink (Solvent)', hsnCode: '3215', gstRate: 18 },
  // Ricoh (UV, cross-brand)
  { name: 'Ricoh Gen5 UV Hybrid Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Ricoh GH2220 UV Hybrid Ink', hsnCode: '3215', gstRate: 18 },
  // Konica (UV line)
  { name: 'Konica 1024A UV Ink', hsnCode: '3215', gstRate: 18 },
  // Combined current-stock line: the "UVinks for Konica and Ricoh" stock
  // sheet reports one reading not attributable to either printhead alone.
  { name: 'Konica/Ricoh UV Ink', hsnCode: '3215', gstRate: 18 },
  // Other
  { name: 'SJ UV Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Universal UV Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Inktec UV Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Japan UV Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Glass Coating', hsnCode: '3209', gstRate: 18 },
  { name: 'Eco Premium Cartridge', hsnCode: '3215', gstRate: 18 },
  // Generic (brand-unspecified) categories - added after validating the
  // taxonomy against real FY2026-27 ledger data during the customer/invoice
  // migration: customers frequently buy "UV Flush"/"Solvent Flush"/"Eco
  // Solvent Ink"/"UV Ink" with no brand named at all, which the
  // brand-specific taxonomy above has no target for. Distinct from the
  // LEGACY_PLACEHOLDER_CATEGORY_NAMES of the same name removed above - those
  // were Sprint 1 placeholders; these are validated, permanent categories.
  { name: 'Eco Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'UV Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Solvent Flush', hsnCode: '3820', gstRate: 18 },
  { name: 'UV Flush', hsnCode: '3820', gstRate: 18 },
];

interface LiveStockProductSeed {
  categoryName: string;
  color: string;
  currentStock: number;
}

const MIGRATION_OPENING_STOCK_REASON = 'MIGRATION_OPENING_STOCK';

// Current stock snapshot verified directly against
// "docs/migration/Digital Technologies/Digital Technologies/INK STOCK/2026/July - 2026.xls"
// (last populated row per sheet, as of 17.07.2026). One-time migration
// baseline for Product.currentStock going forward — not re-derived from
// the source file on later seed runs.
const liveStockProducts: LiveStockProductSeed[] = [
  // UVinks for Konica and Ricoh
  { categoryName: 'Konica/Ricoh UV Ink', color: 'Cyan', currentStock: 7 },
  { categoryName: 'Konica/Ricoh UV Ink', color: 'Magenta', currentStock: 0 },
  { categoryName: 'Konica/Ricoh UV Ink', color: 'Yellow', currentStock: 2 },
  { categoryName: 'Konica/Ricoh UV Ink', color: 'Black', currentStock: 1 },
  { categoryName: 'Konica/Ricoh UV Ink', color: 'White', currentStock: 0 },
  // Universal UV Inks
  { categoryName: 'Universal UV Ink', color: 'Cyan', currentStock: 0 },
  { categoryName: 'Universal UV Ink', color: 'Magenta', currentStock: 6 },
  { categoryName: 'Universal UV Ink', color: 'Yellow', currentStock: 7 },
  { categoryName: 'Universal UV Ink', color: 'Black', currentStock: 7 },
  { categoryName: 'Universal UV Ink', color: 'White', currentStock: 0 },
  { categoryName: 'Universal UV Ink', color: 'Varnish', currentStock: 0 },
  { categoryName: 'Universal UV Ink', color: 'Flush', currentStock: 0 },
  // ALLWIN Eco
  { categoryName: 'Allwin Eco Solvent Ink', color: 'Cyan', currentStock: 3 },
  { categoryName: 'Allwin Eco Solvent Ink', color: 'Magenta', currentStock: 5 },
  { categoryName: 'Allwin Eco Solvent Ink', color: 'Yellow', currentStock: 2 },
  { categoryName: 'Allwin Eco Solvent Ink', color: 'Black', currentStock: 2 },
  { categoryName: 'Allwin Eco Solvent Ink', color: 'S', currentStock: 1 },
  // Allwin 512i
  { categoryName: 'Allwin Konica 512i Solvent Ink', color: 'Cyan', currentStock: 17 },
  { categoryName: 'Allwin Konica 512i Solvent Ink', color: 'Magenta', currentStock: 5 },
  { categoryName: 'Allwin Konica 512i Solvent Ink', color: 'Yellow', currentStock: 17 },
  { categoryName: 'Allwin Konica 512i Solvent Ink', color: 'Black', currentStock: 3 },
  { categoryName: 'Allwin Konica 512i Solvent Ink', color: 'S', currentStock: 11 },
  // Allwin C1024i - mapped to the generic Allwin Konica Solvent Ink
  // category (no Allwin-specific 1024i category exists in the taxonomy).
  { categoryName: 'Allwin Konica Solvent Ink', color: 'Cyan', currentStock: 25 },
  { categoryName: 'Allwin Konica Solvent Ink', color: 'Magenta', currentStock: 30 },
  { categoryName: 'Allwin Konica Solvent Ink', color: 'Mustard Yellow', currentStock: 90 },
  { categoryName: 'Allwin Konica Solvent Ink', color: 'Lime Yellow', currentStock: 35 },
  { categoryName: 'Allwin Konica Solvent Ink', color: 'Black', currentStock: 0 },
  // Toyo_Inks
  { categoryName: 'Toyo Ink (Solvent)', color: 'Cyan', currentStock: 3 },
  { categoryName: 'Toyo Ink (Solvent)', color: 'Magenta', currentStock: 0 },
  { categoryName: 'Toyo Ink (Solvent)', color: 'Yellow', currentStock: 0 },
  { categoryName: 'Toyo Ink (Solvent)', color: 'Black', currentStock: 0 },
  { categoryName: 'Toyo Ink (Solvent)', color: 'S', currentStock: 0 },
  // SJ_UV Ink
  { categoryName: 'SJ UV Ink', color: 'Cyan', currentStock: 28 },
  { categoryName: 'SJ UV Ink', color: 'Magenta', currentStock: 30 },
  { categoryName: 'SJ UV Ink', color: 'Yellow', currentStock: 30 },
  { categoryName: 'SJ UV Ink', color: 'Black', currentStock: 18 },
  { categoryName: 'SJ UV Ink', color: 'White', currentStock: 0 },
];

async function main(): Promise<void> {
  console.log('Removing legacy placeholder categories...');

  for (const name of LEGACY_PLACEHOLDER_CATEGORY_NAMES) {
    const legacyCategory = await prisma.category.findUnique({ where: { name } });
    if (!legacyCategory) continue;

    const referencingProduct = await prisma.product.findFirst({
      where: { categoryId: legacyCategory.id },
    });
    if (referencingProduct) {
      console.warn(
        `Skipping deletion of legacy category "${name}" - still referenced by product "${referencingProduct.name}".`
      );
      continue;
    }

    await prisma.category.delete({ where: { id: legacyCategory.id } });
  }

  console.log('Seeding categories...');

  await prisma.category.createMany({
    data: categories.map((c) => ({
      name: c.name,
      hsnCode: c.hsnCode,
      gstRate: c.gstRate,
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${categories.length} categories (skipping duplicates).`);

  // Fetch all categories to get their generated IDs
  const savedCategories = await prisma.category.findMany();
  const categoryMap = new Map<string, string>(
    savedCategories.map((c: { name: string; id: string }) => [c.name, c.id])
  );

  console.log('Seeding live stock products and opening stock snapshot...');

  let seededStockCount = 0;
  for (const item of liveStockProducts) {
    const categoryId = categoryMap.get(item.categoryName);
    if (!categoryId) {
      throw new Error(`Category not found for product: ${item.color} (${item.categoryName})`);
    }

    let product = await prisma.product.findFirst({
      where: { name: item.color, categoryId },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: item.color,
          categoryId,
          basePrice: 0,
          unit: 'LTR',
        },
      });
    }

    // Idempotency guard: the opening-stock write is what actually matters
    // (not just product existence), so re-running the seed after a crash
    // between product creation and stock seeding still self-heals - but
    // only if nothing has touched this product's stock in the meantime.
    // Re-reading currentStock (rather than assuming stockBefore: 0) avoids
    // fabricating a false ledger entry over a real stock movement.
    const existingOpeningStockTxn = await prisma.stockTransaction.findFirst({
      where: { productId: product.id, reason: MIGRATION_OPENING_STOCK_REASON },
    });
    if (existingOpeningStockTxn) {
      continue;
    }

    if (!product.currentStock.equals(0)) {
      console.warn(
        `Skipping opening stock for "${item.color}" (${item.categoryName}) - ` +
          `currentStock is already ${product.currentStock.toString()}, not 0. ` +
          `Needs manual review before seeding a migration baseline over it.`
      );
      continue;
    }

    const currentStock = new Decimal(item.currentStock);
    await prisma.$transaction([
      prisma.stockTransaction.create({
        data: {
          productId: product.id,
          changeQty: currentStock,
          stockBefore: new Decimal(0),
          stockAfter: currentStock,
          reason: MIGRATION_OPENING_STOCK_REASON,
        },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: { currentStock },
      }),
    ]);
    seededStockCount += 1;
  }

  console.log(
    `Seeded opening stock for ${seededStockCount}/${liveStockProducts.length} live-stock products (rest already seeded).`
  );

  console.log('Seeding settings...');

  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        companyName: 'DigiERP Ink Distributors',
        companyAddress: 'Ahmedabad, Gujarat',
        companyState: COMPANY_STATE,
        companyGstin: '24AAAAA0000A1Z5',
        companyPan: 'AAAAA0000A',
      },
    });
    console.log('Seeded default settings row.');
  } else {
    console.log('Settings row already exists, skipping.');
  }

  console.log('Seeding admin user...');

  const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: hashPassword('Admin@123'),
        role: 'admin',
      },
    });
    console.log('Seeded admin user.');
  } else {
    console.log('Admin user already exists, skipping.');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
