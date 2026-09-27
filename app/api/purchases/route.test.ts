import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  default: {
    vendor: { findUnique: vi.fn() },
    settings: { findFirst: vi.fn() },
    product: { findMany: vi.fn(), update: vi.fn() },
    purchase: { findFirst: vi.fn(), create: vi.fn() },
    stockTransaction: { createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import prisma from '@/lib/prisma';
import { POST } from './route';

const vendorId = '11111111-1111-4111-8111-111111111111';
const productId = '22222222-2222-4222-8222-222222222222';

const vendor = {
  id: vendorId,
  name: 'Test Vendor',
  state: 'Gujarat',
};

const settings = {
  id: 1,
  companyState: 'Gujarat',
};

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost/api/purchases', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const requestBody = {
  vendorId,
  vendorInvoiceNo: 'INV-1',
  date: new Date('2026-07-01').toISOString(),
  items: [{ productId, quantity: 5, unitPrice: 100 }],
};

describe('POST /api/purchases — null-HSN block', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(vendor as never);
    vi.mocked(prisma.settings.findFirst).mockResolvedValue(settings as never);
  });

  it('responds 400 with TAX_CLASS_MISSING_HSN when the product tax class has no HSN code', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      {
        id: productId,
        name: 'Wiper Blade',
        currentStock: 0,
        taxClassId: null,
        taxClass: null,
        line: { taxClass: { name: 'Spares', hsnCode: null, gstRate: 18 } },
      },
    ] as never);

    const response = await POST(buildRequest(requestBody));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('TAX_CLASS_MISSING_HSN');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('proceeds to create the purchase when the effective tax class has an HSN code', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      {
        id: productId,
        name: 'Wiper Blade',
        currentStock: 0,
        taxClassId: null,
        taxClass: null,
        line: { taxClass: { name: 'Spares', hsnCode: '8443', gstRate: 18 } },
      },
    ] as never);
    vi.mocked(prisma.purchase.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockImplementation((async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma)) as unknown as typeof prisma.$transaction);
    vi.mocked(prisma.purchase.create).mockResolvedValue({ id: 'purchase-1' } as never);
    vi.mocked(prisma.stockTransaction.createMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.product.update).mockResolvedValue({} as never);

    const response = await POST(buildRequest(requestBody));

    expect(response.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
