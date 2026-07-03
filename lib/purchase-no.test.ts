import { describe, it, expect, vi } from 'vitest';
import { generatePurchaseNo } from './purchase-no';
import prisma from './prisma';

vi.mock('./prisma', () => ({
  default: {
    purchase: {
      findFirst: vi.fn(),
    },
  },
}));

describe('generatePurchaseNo', () => {
  it('should generate first purchase no when no existing purchases', async () => {
    vi.mocked(prisma.purchase.findFirst).mockResolvedValue(null);
    const no = await generatePurchaseNo();
    expect(no).toMatch(/^PUR-\d{4}-001$/);
  });

  it('should increment purchase no correctly', async () => {
    vi.mocked(prisma.purchase.findFirst).mockResolvedValue({
      purchaseNo: 'PUR-2526-005',
    } as never);
    const no = await generatePurchaseNo();
    expect(no).toMatch(/^PUR-\d{4}-006$/);
  });
});
