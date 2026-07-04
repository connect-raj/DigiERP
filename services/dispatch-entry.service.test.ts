import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { dispatchEntryService } from './dispatch-entry.service';
import { dispatchEntryRepository } from '@/repositories/dispatch-entry.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';
import { CreateDispatchEntryInput } from '@/validations/dispatch-entry';

vi.mock('@/repositories/dispatch-entry.repository', () => ({
  dispatchEntryRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findCustomerById: vi.fn(),
    findProductsByIds: vi.fn(),
    findCustomerPrices: vi.fn(),
    createWithStockDecrement: vi.fn(),
    cancelWithStockRestore: vi.fn(),
  },
}));

const gujaratCustomer = {
  id: 'cust-1',
  firmName: 'Test Firm',
  state: 'Gujarat',
  gstin: null,
  outstandingBalance: 0,
  creditLimit: 100000,
};

const product = {
  id: 'prod-1',
  name: 'Ink Red',
  basePrice: 100,
  currentStock: 50,
  category: { id: 'cat-1', name: 'Ink', gstRate: 18 },
};

const baseInput: CreateDispatchEntryInput = {
  challanNo: 'CH-001',
  customerId: 'cust-1',
  place: 'Ahmedabad',
  date: '2026-07-01T00:00:00.000Z',
  items: [{ productId: 'prod-1', quantity: 5 }],
};

describe('DispatchEntryService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAll', () => {
    it('passes filters through to the repository', async () => {
      vi.spyOn(dispatchEntryRepository, 'findAll').mockResolvedValue([] as never);
      await dispatchEntryService.getAll({ customerId: 'cust-1' });
      expect(dispatchEntryRepository.findAll).toHaveBeenCalledWith({ customerId: 'cust-1' });
    });
  });

  describe('getById', () => {
    it('throws NotFoundError when the entry does not exist', async () => {
      vi.spyOn(dispatchEntryRepository, 'findById').mockResolvedValue(null);
      await expect(dispatchEntryService.getById('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('throws NotFoundError when the customer does not exist', async () => {
      vi.spyOn(dispatchEntryRepository, 'findCustomerById').mockResolvedValue(null);
      await expect(dispatchEntryService.create(baseInput)).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError when a product does not exist', async () => {
      vi.spyOn(dispatchEntryRepository, 'findCustomerById').mockResolvedValue(
        gujaratCustomer as never
      );
      vi.spyOn(dispatchEntryRepository, 'findProductsByIds').mockResolvedValue([]);
      await expect(dispatchEntryService.create(baseInput)).rejects.toThrow(BadRequestError);
    });

    it('falls back to Product.basePrice when no CustomerPrice exists', async () => {
      vi.spyOn(dispatchEntryRepository, 'findCustomerById').mockResolvedValue(
        gujaratCustomer as never
      );
      vi.spyOn(dispatchEntryRepository, 'findProductsByIds').mockResolvedValue([product as never]);
      vi.spyOn(dispatchEntryRepository, 'findCustomerPrices').mockResolvedValue([]);
      vi.spyOn(dispatchEntryRepository, 'createWithStockDecrement').mockResolvedValue({
        id: 'entry-1',
      } as never);

      await dispatchEntryService.create(baseInput);

      expect(dispatchEntryRepository.createWithStockDecrement).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [expect.objectContaining({ price: 100 })],
        })
      );
    });

    it('uses CustomerPrice over basePrice when one exists', async () => {
      vi.spyOn(dispatchEntryRepository, 'findCustomerById').mockResolvedValue(
        gujaratCustomer as never
      );
      vi.spyOn(dispatchEntryRepository, 'findProductsByIds').mockResolvedValue([product as never]);
      vi.spyOn(dispatchEntryRepository, 'findCustomerPrices').mockResolvedValue([
        { id: 'cp-1', customerId: 'cust-1', productId: 'prod-1', price: 90 } as never,
      ]);
      vi.spyOn(dispatchEntryRepository, 'createWithStockDecrement').mockResolvedValue({
        id: 'entry-1',
      } as never);

      await dispatchEntryService.create(baseInput);

      expect(dispatchEntryRepository.createWithStockDecrement).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [expect.objectContaining({ price: 90 })],
        })
      );
    });

    it('honours an explicit per-line price override over CustomerPrice', async () => {
      vi.spyOn(dispatchEntryRepository, 'findCustomerById').mockResolvedValue(
        gujaratCustomer as never
      );
      vi.spyOn(dispatchEntryRepository, 'findProductsByIds').mockResolvedValue([product as never]);
      vi.spyOn(dispatchEntryRepository, 'findCustomerPrices').mockResolvedValue([
        { id: 'cp-1', customerId: 'cust-1', productId: 'prod-1', price: 90 } as never,
      ]);
      vi.spyOn(dispatchEntryRepository, 'createWithStockDecrement').mockResolvedValue({
        id: 'entry-1',
      } as never);

      await dispatchEntryService.create({
        ...baseInput,
        items: [{ productId: 'prod-1', quantity: 5, price: 75 }],
      });

      expect(dispatchEntryRepository.createWithStockDecrement).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [expect.objectContaining({ price: 75 })],
        })
      );
    });

    it('splits GST into CGST/SGST when customer state matches company state', async () => {
      vi.spyOn(dispatchEntryRepository, 'findCustomerById').mockResolvedValue(
        gujaratCustomer as never
      );
      vi.spyOn(dispatchEntryRepository, 'findProductsByIds').mockResolvedValue([product as never]);
      vi.spyOn(dispatchEntryRepository, 'findCustomerPrices').mockResolvedValue([]);
      vi.spyOn(dispatchEntryRepository, 'createWithStockDecrement').mockResolvedValue({
        id: 'entry-1',
      } as never);

      await dispatchEntryService.create(baseInput);

      expect(dispatchEntryRepository.createWithStockDecrement).toHaveBeenCalledWith(
        expect.objectContaining({
          totalCgst: 45,
          totalSgst: 45,
          totalIgst: 0,
        })
      );
    });

    it('uses IGST when customer state differs from company state', async () => {
      vi.spyOn(dispatchEntryRepository, 'findCustomerById').mockResolvedValue({
        ...gujaratCustomer,
        state: 'Maharashtra',
      } as never);
      vi.spyOn(dispatchEntryRepository, 'findProductsByIds').mockResolvedValue([product as never]);
      vi.spyOn(dispatchEntryRepository, 'findCustomerPrices').mockResolvedValue([]);
      vi.spyOn(dispatchEntryRepository, 'createWithStockDecrement').mockResolvedValue({
        id: 'entry-1',
      } as never);

      await dispatchEntryService.create(baseInput);

      expect(dispatchEntryRepository.createWithStockDecrement).toHaveBeenCalledWith(
        expect.objectContaining({
          totalCgst: 0,
          totalSgst: 0,
          totalIgst: 90,
        })
      );
    });

    it('maps a P2002 error to CHALLAN_NUMBER_ALREADY_EXISTS', async () => {
      vi.spyOn(dispatchEntryRepository, 'findCustomerById').mockResolvedValue(
        gujaratCustomer as never
      );
      vi.spyOn(dispatchEntryRepository, 'findProductsByIds').mockResolvedValue([product as never]);
      vi.spyOn(dispatchEntryRepository, 'findCustomerPrices').mockResolvedValue([]);
      vi.spyOn(dispatchEntryRepository, 'createWithStockDecrement').mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.19.3',
        })
      );

      await expect(dispatchEntryService.create(baseInput)).rejects.toThrow(
        expect.objectContaining({ code: 'CHALLAN_NUMBER_ALREADY_EXISTS' })
      );
    });

    it('includes a CREDIT_LIMIT_EXCEEDED warning when the dispatch pushes past the limit', async () => {
      vi.spyOn(dispatchEntryRepository, 'findCustomerById').mockResolvedValue({
        ...gujaratCustomer,
        outstandingBalance: 99900,
        creditLimit: 100000,
      } as never);
      vi.spyOn(dispatchEntryRepository, 'findProductsByIds').mockResolvedValue([product as never]);
      vi.spyOn(dispatchEntryRepository, 'findCustomerPrices').mockResolvedValue([]);
      vi.spyOn(dispatchEntryRepository, 'createWithStockDecrement').mockResolvedValue({
        id: 'entry-1',
      } as never);

      const result = await dispatchEntryService.create(baseInput);

      expect(result.warning).toEqual(expect.objectContaining({ code: 'CREDIT_LIMIT_EXCEEDED' }));
    });

    it('omits the warning key entirely when within the credit limit', async () => {
      vi.spyOn(dispatchEntryRepository, 'findCustomerById').mockResolvedValue(
        gujaratCustomer as never
      );
      vi.spyOn(dispatchEntryRepository, 'findProductsByIds').mockResolvedValue([product as never]);
      vi.spyOn(dispatchEntryRepository, 'findCustomerPrices').mockResolvedValue([]);
      vi.spyOn(dispatchEntryRepository, 'createWithStockDecrement').mockResolvedValue({
        id: 'entry-1',
      } as never);

      const result = await dispatchEntryService.create(baseInput);

      expect(result.warning).toBeUndefined();
    });
  });

  describe('cancel', () => {
    it('throws DISPATCH_ENTRY_ALREADY_BILLED when status is BILLED', async () => {
      vi.spyOn(dispatchEntryRepository, 'findById').mockResolvedValue({
        id: 'entry-1',
        status: 'BILLED',
        isCancelled: false,
        items: [],
      } as never);

      await expect(dispatchEntryService.cancel('entry-1')).rejects.toThrow(
        expect.objectContaining({ code: 'DISPATCH_ENTRY_ALREADY_BILLED' })
      );
    });

    it('throws DISPATCH_ENTRY_ALREADY_CANCELLED when already cancelled', async () => {
      vi.spyOn(dispatchEntryRepository, 'findById').mockResolvedValue({
        id: 'entry-1',
        status: 'PENDING_BILLING',
        isCancelled: true,
        items: [],
      } as never);

      await expect(dispatchEntryService.cancel('entry-1')).rejects.toThrow(
        expect.objectContaining({ code: 'DISPATCH_ENTRY_ALREADY_CANCELLED' })
      );
    });

    it('restores stock for a cancellable entry', async () => {
      vi.spyOn(dispatchEntryRepository, 'findById').mockResolvedValue({
        id: 'entry-1',
        status: 'PENDING_BILLING',
        isCancelled: false,
        items: [{ productId: 'prod-1', quantity: 5 }],
      } as never);
      vi.spyOn(dispatchEntryRepository, 'cancelWithStockRestore').mockResolvedValue([
        { productId: 'prod-1', productName: 'Ink Red', qty: 5 },
      ]);

      const result = await dispatchEntryService.cancel('entry-1');

      expect(dispatchEntryRepository.cancelWithStockRestore).toHaveBeenCalledWith('entry-1', [
        { productId: 'prod-1', quantity: 5 },
      ]);
      expect(result).toEqual([{ productId: 'prod-1', productName: 'Ink Red', qty: 5 }]);
    });
  });
});
