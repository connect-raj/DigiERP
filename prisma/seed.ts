import prisma from '@/lib/prisma';

interface CategorySeed {
  name: string;
  hsnCode: string;
  gstRate: number;
}

interface ProductSeed {
  name: string;
  categoryName: string;
  basePrice: number;
  unit: string;
}

const categories: CategorySeed[] = [
  { name: 'Konica 512i Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Konica 1024i Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Eco Solvent Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'UV Ink', hsnCode: '3215', gstRate: 18 },
  { name: 'Solvent Flush', hsnCode: '3820', gstRate: 18 },
  { name: 'UV Flush', hsnCode: '3820', gstRate: 18 },
  { name: 'UV Varnish', hsnCode: '3209', gstRate: 18 },
];

const products: ProductSeed[] = [
  // Konica 512i Solvent Ink
  { name: 'Cyan 1Ltr', categoryName: 'Konica 512i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Magenta 1Ltr', categoryName: 'Konica 512i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Yellow 1Ltr', categoryName: 'Konica 512i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Black 1Ltr', categoryName: 'Konica 512i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Cyan 5Ltr', categoryName: 'Konica 512i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Magenta 5Ltr', categoryName: 'Konica 512i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Yellow 5Ltr', categoryName: 'Konica 512i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Black 5Ltr', categoryName: 'Konica 512i Solvent Ink', basePrice: 0, unit: 'LTR' },
  // Konica 1024i Solvent Ink
  { name: 'Cyan 1Ltr', categoryName: 'Konica 1024i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Magenta 1Ltr', categoryName: 'Konica 1024i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Yellow 1Ltr', categoryName: 'Konica 1024i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Black 1Ltr', categoryName: 'Konica 1024i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Cyan 5Ltr', categoryName: 'Konica 1024i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Magenta 5Ltr', categoryName: 'Konica 1024i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Yellow 5Ltr', categoryName: 'Konica 1024i Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Black 5Ltr', categoryName: 'Konica 1024i Solvent Ink', basePrice: 0, unit: 'LTR' },
  // Eco Solvent Ink
  { name: 'Cyan', categoryName: 'Eco Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Magenta', categoryName: 'Eco Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Yellow', categoryName: 'Eco Solvent Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Black', categoryName: 'Eco Solvent Ink', basePrice: 0, unit: 'LTR' },
  // UV Ink
  { name: 'Cyan', categoryName: 'UV Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Magenta', categoryName: 'UV Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Yellow', categoryName: 'UV Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Black', categoryName: 'UV Ink', basePrice: 0, unit: 'LTR' },
  { name: 'White', categoryName: 'UV Ink', basePrice: 0, unit: 'LTR' },
  { name: 'Varnish', categoryName: 'UV Ink', basePrice: 0, unit: 'LTR' },
  // Solvent Flush
  { name: 'Flush 1Ltr', categoryName: 'Solvent Flush', basePrice: 0, unit: 'LTR' },
  // UV Flush
  { name: 'Flush 1Ltr', categoryName: 'UV Flush', basePrice: 0, unit: 'LTR' },
  // UV Varnish
  { name: 'Varnish 1Ltr', categoryName: 'UV Varnish', basePrice: 0, unit: 'LTR' },
];

async function main(): Promise<void> {
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
  const categoryMap = new Map<string, string>(savedCategories.map((c: { name: string; id: string }) => [c.name, c.id]));

  console.log('Seeding products...');

  await prisma.product.createMany({
    data: products.map((p) => {
      const categoryId = categoryMap.get(p.categoryName);
      if (!categoryId) {
        throw new Error(`Category not found for product: ${p.name} (${p.categoryName})`);
      }
      return {
        name: p.name,
        categoryId,
        basePrice: p.basePrice,
        unit: p.unit,
      };
    }),
    skipDuplicates: true,
  });

  console.log(`Seeded ${products.length} products (skipping duplicates).`);
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
