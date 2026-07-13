import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocStatus } from '@prisma/client';
import { invoiceService } from './invoice.service';
import { invoiceRepository } from '@/repositories/invoice.repository';
import { NotFoundError, BadRequestError, AppError } from '@/lib/errors';
import { CreateInvoiceInput } from '@/validations/invoice';

vi.mock('@/repositories/invoice.repository', () => ({
  invoiceRepository: {
    findAll: vi.fn(),
    findStatsRows: vi.fn(),
    findById: vi.fn(),
    findSnapshotById: vi.fn(),
    findDispatchEntryForInvoicing: vi.fn(),
    findSettings: vi.fn(),
    createInvoiceTx: vi.fn(),
  },
}));

const gujaratSettings = {
  id: 1,
  companyName: 'DigiERP Ink Distributors',
  companyAddress: 'Ahmedabad, Gujarat',
  companyState: 'Gujarat',
  companyGstin: '24AAAAA0000A1Z5',
  companyPan: 'AAAAA0000A',
};

const baseDispatchEntry = {
  id: 'de-1',
  challanNo: 'CH-001',
  customerId: 'cust-1',
  place: 'Ahmedabad',
  transport: 'ABC Transport',
  date: new Date('2026-07-01'),
  status: DocStatus.PENDING_BILLING,
  isCancelled: false,
  customer: {
    id: 'cust-1',
    firmName: 'Test Firm',
    address: 'Some Street',
    city: 'Ahmedabad',
    state: 'Gujarat',
    gstin: null,
  },
  items: [
    {
      productId: 'prod-1',
      quantity: 10,
      price: 100,
      product: {
        name: 'Ink Red',
        unit: 'LTR',
        category: { name: 'Ink', hsnCode: '3215', gstRate: 18 },
      },
    },
  ],
};

const input: CreateInvoiceInput = { dispatchEntryId: 'de-1' };

describe('InvoiceService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('throws NotFoundError with DISPATCH_ENTRY_NOT_FOUND when dispatch entry is missing', async () => {
      vi.spyOn(invoiceRepository, 'findDispatchEntryForInvoicing').mockResolvedValue(null);

      await expect(invoiceService.create(input)).rejects.toMatchObject({
        code: 'DISPATCH_ENTRY_NOT_FOUND',
      });
      await expect(invoiceService.create(input)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws BadRequestError with DISPATCH_ENTRY_CANCELLED when the dispatch entry is cancelled', async () => {
      vi.spyOn(invoiceRepository, 'findDispatchEntryForInvoicing').mockResolvedValue({
        ...baseDispatchEntry,
        isCancelled: true,
      } as never);

      await expect(invoiceService.create(input)).rejects.toMatchObject({
        code: 'DISPATCH_ENTRY_CANCELLED',
      });
      await expect(invoiceService.create(input)).rejects.toBeInstanceOf(BadRequestError);
    });

    it('throws BadRequestError with DISPATCH_ENTRY_ALREADY_BILLED when already billed', async () => {
      vi.spyOn(invoiceRepository, 'findDispatchEntryForInvoicing').mockResolvedValue({
        ...baseDispatchEntry,
        status: DocStatus.BILLED,
      } as never);

      await expect(invoiceService.create(input)).rejects.toMatchObject({
        code: 'DISPATCH_ENTRY_ALREADY_BILLED',
      });
    });

    it('throws AppError with SETTINGS_NOT_CONFIGURED when no settings row exists', async () => {
      vi.spyOn(invoiceRepository, 'findDispatchEntryForInvoicing').mockResolvedValue(
        baseDispatchEntry as never
      );
      vi.spyOn(invoiceRepository, 'findSettings').mockResolvedValue(null);

      await expect(invoiceService.create(input)).rejects.toMatchObject({
        code: 'SETTINGS_NOT_CONFIGURED',
      });
      await expect(invoiceService.create(input)).rejects.toBeInstanceOf(AppError);
    });

    it('computes CGST/SGST when customer state matches company state', async () => {
      vi.spyOn(invoiceRepository, 'findDispatchEntryForInvoicing').mockResolvedValue(
        baseDispatchEntry as never
      );
      vi.spyOn(invoiceRepository, 'findSettings').mockResolvedValue(gujaratSettings as never);
      const createSpy = vi
        .spyOn(invoiceRepository, 'createInvoiceTx')
        .mockResolvedValue({ id: 'inv-1' } as never);

      await invoiceService.create(input);

      const callArg = createSpy.mock.calls[0][0];
      // price 100 * qty 10 = 1000 base; gstRate 18% split -> 90 cgst + 90 sgst
      expect(callArg.items[0].cgst).toBeCloseTo(90);
      expect(callArg.items[0].sgst).toBeCloseTo(90);
      expect(callArg.items[0].igst).toBe(0);
      expect(callArg.totalAmount).toBeCloseTo(1180);
    });

    it('computes IGST when customer state differs from company state', async () => {
      vi.spyOn(invoiceRepository, 'findDispatchEntryForInvoicing').mockResolvedValue({
        ...baseDispatchEntry,
        customer: { ...baseDispatchEntry.customer, state: 'Maharashtra' },
      } as never);
      vi.spyOn(invoiceRepository, 'findSettings').mockResolvedValue(gujaratSettings as never);
      const createSpy = vi
        .spyOn(invoiceRepository, 'createInvoiceTx')
        .mockResolvedValue({ id: 'inv-1' } as never);

      await invoiceService.create(input);

      const callArg = createSpy.mock.calls[0][0];
      expect(callArg.items[0].igst).toBeCloseTo(180);
      expect(callArg.items[0].cgst).toBe(0);
      expect(callArg.items[0].sgst).toBe(0);
    });
  });

  describe('getById', () => {
    it('throws NotFoundError when the invoice does not exist', async () => {
      vi.spyOn(invoiceRepository, 'findById').mockResolvedValue(null);
      await expect(invoiceService.getById('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getSnapshotById', () => {
    it('throws NotFoundError when the invoice does not exist', async () => {
      vi.spyOn(invoiceRepository, 'findSnapshotById').mockResolvedValue(null);
      await expect(invoiceService.getSnapshotById('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getSummary', () => {
    it('sums invoiced/paid and treats non-PAID rows as outstanding', async () => {
      vi.spyOn(invoiceRepository, 'findStatsRows').mockResolvedValue([
        { totalAmount: 1000, paidAmount: 1000, paymentStatus: 'PAID' },
        { totalAmount: 500, paidAmount: 200, paymentStatus: 'PARTIAL' },
        { totalAmount: 300, paidAmount: 0, paymentStatus: 'UNPAID' },
      ] as never);

      const result = await invoiceService.getSummary({});

      expect(result).toEqual({
        totalInvoiced: 1800,
        outstanding: 600,
        paid: 1200,
        pendingCount: 2,
      });
    });
  });
});
