import prisma from '@/lib/prisma';
import { COMPANY_STATE } from '@/lib/constants';
import { hashPassword } from '@/lib/auth-utils';

async function main(): Promise<void> {
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
