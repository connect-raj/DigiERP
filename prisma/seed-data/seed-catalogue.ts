/**
 * Idempotent catalogue seed. Reads prisma/seed-data/catalogue.json and upserts:
 *   - 9 lookup tables (Printhead, Colour, ColourSet(+ColourSetColour), Unit, Technology,
 *     Format, LineRole, Brand, TaxClass) keyed on each model's `@unique name` field.
 *   - ProductLine rows keyed on `name`/`slug` (both unique).
 *   - LineHead join rows, fully replaced per line on every run (delete + recreate is a
 *     no-op when the head list hasn't changed, so this stays idempotent).
 *   - Product rows for INK/Flush lines, keyed on the `[lineId, name]` unique constraint.
 *     Names are generated with the exact same rule as services/product.service.ts's
 *     generateInkName(): `${line.name} – ${colour?.name} – ${packSize} ${unit.name}`.
 *
 * Safe to run against a database that already has real data in unrelated tables — this
 * script only ever touches the catalogue tables listed above (never Vendor, Customer,
 * Purchase, DispatchEntry, Invoice, Payment, User, Settings, Inquiry, ...).
 *
 * Run with: npm run seed:catalogue
 */
import prisma from '@/lib/prisma';
import { ProductKind } from '@prisma/client';
import catalogue from './catalogue.json';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Mirrors ProductService.generateInkName exactly — do not let this drift from it. */
function generateInkName(
  lineName: string,
  colourName: string | undefined,
  packSize: number,
  unitName: string
): string {
  const parts = [lineName];
  if (colourName) parts.push(colourName);
  parts.push(`${packSize} ${unitName}`);
  return parts.join(' – ');
}

async function seedLookups() {
  console.log('Seeding lookup tables...');

  for (const p of catalogue.printheads) {
    await prisma.printhead.upsert({
      where: { name: p.name },
      create: { name: p.name, dropSizePl: p.dropSizePl },
      update: { dropSizePl: p.dropSizePl },
    });
  }

  for (const c of catalogue.colours) {
    await prisma.colour.upsert({
      where: { name: c.name },
      create: { name: c.name },
      update: {},
    });
  }

  for (const u of catalogue.units) {
    await prisma.unit.upsert({
      where: { name: u.name },
      create: { name: u.name, appliesTo: u.appliesTo as ProductKind[] },
      update: { appliesTo: u.appliesTo as ProductKind[] },
    });
  }

  for (const t of catalogue.technologies) {
    await prisma.technology.upsert({
      where: { name: t.name },
      create: { name: t.name },
      update: {},
    });
  }

  for (const f of catalogue.formats) {
    await prisma.format.upsert({
      where: { name: f.name },
      create: { name: f.name },
      update: {},
    });
  }

  for (const r of catalogue.roles) {
    await prisma.lineRole.upsert({
      where: { name: r.name },
      create: { name: r.name, usesColours: r.usesColours },
      update: { usesColours: r.usesColours },
    });
  }

  for (const b of catalogue.brands) {
    await prisma.brand.upsert({
      where: { name: b.name },
      create: { name: b.name },
      update: {},
    });
  }

  for (const tc of catalogue.taxClasses) {
    await prisma.taxClass.upsert({
      where: { name: tc.name },
      create: { name: tc.name, hsnCode: tc.hsnCode, gstRate: tc.gstRate },
      update: { hsnCode: tc.hsnCode, gstRate: tc.gstRate },
    });
  }

  // Colour sets depend on colours already existing.
  const colourIdByName = new Map(
    (await prisma.colour.findMany()).map((c) => [c.name, c.id] as const)
  );

  for (const cs of catalogue.colourSets) {
    const colourSet = await prisma.colourSet.upsert({
      where: { name: cs.name },
      create: { name: cs.name },
      update: {},
    });

    for (let i = 0; i < cs.colours.length; i++) {
      const colourName = cs.colours[i];
      const colourId = colourIdByName.get(colourName);
      if (!colourId) {
        throw new Error(`Colour set '${cs.name}' references unknown colour '${colourName}'`);
      }
      await prisma.colourSetColour.upsert({
        where: { colourSetId_colourId: { colourSetId: colourSet.id, colourId } },
        create: { colourSetId: colourSet.id, colourId, sortOrder: i },
        update: { sortOrder: i },
      });
    }
  }

  console.log('Lookup tables seeded.');
}

async function seedProductLinesAndProducts() {
  console.log('Seeding product lines and products...');

  const [brands, technologies, formats, roles, colourSets, taxClasses, printheads, units] =
    await Promise.all([
      prisma.brand.findMany(),
      prisma.technology.findMany(),
      prisma.format.findMany(),
      prisma.lineRole.findMany(),
      prisma.colourSet.findMany({ include: { colours: { include: { colour: true }, orderBy: { sortOrder: 'asc' } } } }),
      prisma.taxClass.findMany(),
      prisma.printhead.findMany(),
      prisma.unit.findMany(),
    ]);

  const brandId = new Map(brands.map((b) => [b.name, b.id] as const));
  const technologyId = new Map(technologies.map((t) => [t.name, t.id] as const));
  const formatId = new Map(formats.map((f) => [f.name, f.id] as const));
  const roleId = new Map(roles.map((r) => [r.name, r.id] as const));
  const colourSetByName = new Map(colourSets.map((cs) => [cs.name, cs] as const));
  const taxClassId = new Map(taxClasses.map((tc) => [tc.name, tc.id] as const));
  const printheadId = new Map(printheads.map((p) => [p.name, p.id] as const));
  const unitByName = new Map(units.map((u) => [u.name, u] as const));

  let productCount = 0;

  for (const line of catalogue.productLines) {
    const slug = slugify(line.name);
    const taxClassIdForLine = taxClassId.get(line.taxClass);
    if (!taxClassIdForLine) {
      throw new Error(`Product line '${line.name}' references unknown tax class '${line.taxClass}'`);
    }

    const colourSetForLine = line.colourSet ? colourSetByName.get(line.colourSet) : undefined;
    if (line.colourSet && !colourSetForLine) {
      throw new Error(`Product line '${line.name}' references unknown colour set '${line.colourSet}'`);
    }

    const productLine = await prisma.productLine.upsert({
      where: { name: line.name },
      create: {
        kind: line.kind as ProductKind,
        name: line.name,
        slug,
        brandId: line.brand ? (brandId.get(line.brand) ?? null) : null,
        technologyId: line.technology ? (technologyId.get(line.technology) ?? null) : null,
        formatId: line.format ? (formatId.get(line.format) ?? null) : null,
        roleId: line.role ? (roleId.get(line.role) ?? null) : null,
        colourSetId: colourSetForLine?.id ?? null,
        taxClassId: taxClassIdForLine,
        aliases: line.aliases ?? [],
      },
      update: {
        kind: line.kind as ProductKind,
        slug,
        brandId: line.brand ? (brandId.get(line.brand) ?? null) : null,
        technologyId: line.technology ? (technologyId.get(line.technology) ?? null) : null,
        formatId: line.format ? (formatId.get(line.format) ?? null) : null,
        roleId: line.role ? (roleId.get(line.role) ?? null) : null,
        colourSetId: colourSetForLine?.id ?? null,
        taxClassId: taxClassIdForLine,
        aliases: line.aliases ?? [],
      },
    });

    // Fully replace the printhead set for this line each run — a no-op on repeat runs
    // when the head list hasn't changed, so this stays idempotent.
    await prisma.lineHead.deleteMany({ where: { lineId: productLine.id } });
    const headIds = line.heads.map((h) => {
      const id = printheadId.get(h);
      if (!id) throw new Error(`Product line '${line.name}' references unknown printhead '${h}'`);
      return id;
    });
    if (headIds.length > 0) {
      await prisma.lineHead.createMany({
        data: headIds.map((printheadId) => ({ lineId: productLine.id, printheadId })),
      });
    }

    if (!line.products) continue;

    const unit = unitByName.get(line.products.unit);
    if (!unit) {
      throw new Error(`Product line '${line.name}' references unknown unit '${line.products.unit}'`);
    }
    const packSize = line.products.packSize;

    if (line.products.perColour) {
      if (!colourSetForLine) {
        throw new Error(`Product line '${line.name}' has perColour products but no colour set`);
      }
      for (const cc of colourSetForLine.colours) {
        const colourName = cc.colour.name;
        const name = generateInkName(line.name, colourName, packSize, unit.name);
        await prisma.product.upsert({
          where: { lineId_name: { lineId: productLine.id, name } },
          create: {
            lineId: productLine.id,
            name,
            unitId: unit.id,
            packSize,
            colourId: cc.colourId,
            basePrice: 0,
            currentStock: 0,
            lowerStockLimit: 0,
          },
          update: {
            unitId: unit.id,
            packSize,
            colourId: cc.colourId,
          },
        });
        productCount++;
      }
    } else {
      const name = generateInkName(line.name, undefined, packSize, unit.name);
      await prisma.product.upsert({
        where: { lineId_name: { lineId: productLine.id, name } },
        create: {
          lineId: productLine.id,
          name,
          unitId: unit.id,
          packSize,
          colourId: null,
          basePrice: 0,
          currentStock: 0,
          lowerStockLimit: 0,
        },
        update: {
          unitId: unit.id,
          packSize,
          colourId: null,
        },
      });
      productCount++;
    }
  }

  console.log(`Seeded ${catalogue.productLines.length} product lines and ${productCount} products.`);
}

async function main() {
  await seedLookups();
  await seedProductLinesAndProducts();
  console.log('Catalogue seed complete.');
}

main()
  .catch((e) => {
    console.error('Catalogue seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
