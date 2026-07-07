import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { generateInvoiceNo } from './invoice-no';

function mockTx(latestInvoiceNo: string | null) {
  return {
    $executeRaw: vi.fn().mockResolvedValue(0),
    invoice: {
      findFirst: vi.fn().mockResolvedValue(latestInvoiceNo ? { invoiceNo: latestInvoiceNo } : null),
    },
  } as unknown as Prisma.TransactionClient;
}

describe('generateInvoiceNo', () => {
  it('generates the first invoice number of a financial year', async () => {
    const tx = mockTx(null);
    const no = await generateInvoiceNo(tx, new Date('2026-07-07'));
    expect(no).toBe('INV-2627-001');
  });

  it('increments sequentially within the same financial year', async () => {
    const tx = mockTx('INV-2627-005');
    const no = await generateInvoiceNo(tx, new Date('2026-07-07'));
    expect(no).toBe('INV-2627-006');
  });

  it('uses the prior financial year for dates before April', async () => {
    const tx = mockTx(null);
    const no = await generateInvoiceNo(tx, new Date('2026-01-15'));
    expect(no).toBe('INV-2526-001');
  });

  it('uses the new financial year starting April', async () => {
    const tx = mockTx(null);
    const no = await generateInvoiceNo(tx, new Date('2026-04-01'));
    expect(no).toBe('INV-2627-001');
  });

  it('acquires an advisory lock scoped to the FY prefix before reading', async () => {
    const tx = mockTx(null);
    await generateInvoiceNo(tx, new Date('2026-07-07'));
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
