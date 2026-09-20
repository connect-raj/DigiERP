import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productService } from './product.service';
import { productRepository } from '@/repositories/product.repository';
import { productLineRepository } from '@/repositories/product-line.repository';
import { unitRepository } from '@/repositories/unit.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('@/repositories/product.repository', () => ({
  productRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    hasOpenChallans: vi.fn(),
    getStock: vi.fn(),
    adjustStock: vi.fn(),
  },
}));

vi.mock('@/repositories/product-line.repository', () => ({
  productLineRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('@/repositories/unit.repository', () => ({
  unitRepository: {
    findById: vi.fn(),
  },
}));

const mockProduct = {
  id: 'prod-id-1',
  name: 'Premium UV Ink – Cyan – 1 LTR',
  lineId: 'line-id-1',
  unitId: 'unit-id-1',
  packSize: new Decimal('1'),
  colourId: 'colour-id-1',
  taxClassId: null,
  basePrice: new Decimal('0.00'),
  currentStock: new Decimal('10.000'),
  lowerStockLimit: new Decimal('2.000'),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  line: { id: 'line-id-1', name: 'Premium UV Ink', kind: 'INK' },
  unit: { id: 'unit-id-1', name: 'LTR' },
  colour: { id: 'colour-id-1', name: 'Cyan' },
  taxClass: null,
  vendorProducts: [],
  stockTxns: [],
};

const mockProductNoStock = { ...mockProduct, currentStock: new Decimal('0.000') };

const inkLine = {
  id: 'line-id-1',
  kind: 'INK',
  name: 'Premium UV Ink',
  role: { id: 'role-1', usesColours: true },
  colourSet: {
    colours: [{ colourId: 'colour-id-1', colour: { name: 'Cyan' } }],
  },
};

const inkLineNoColours = {
  id: 'line-id-2',
  kind: 'INK',
  name: 'Solvent Ink',
  role: { id: 'role-2', usesColours: false },
  colourSet: null,
};

const machineLine = {
  id: 'line-id-3',
  kind: 'MACHINE',
  name: 'Konica 512i Printer',
  role: null,
  colourSet: null,
};

const inkUnit = { id: 'unit-id-1', name: 'LTR', appliesTo: ['INK'] };
const machineUnit = { id: 'unit-id-2', name: 'PCS', appliesTo: ['MACHINE', 'SPARE_PART'] };

describe('ProductService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAll', () => {
    it('should return all products with total count', async () => {
      vi.spyOn(productRepository, 'findAll').mockResolvedValue({
        data: [mockProduct as never],
        total: 1,
      });
      const result = await productService.getAll({});
      expect(productRepository.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual({ data: [mockProduct], total: 1 });
    });
  });

  describe('getById', () => {
    it('should return a product when found', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      const result = await productService.getById('prod-id-1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundError when product does not exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(null);
      await expect(productService.getById('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create an INK product with a colour, generating the printed name', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(inkLine as never);
      vi.spyOn(unitRepository, 'findById').mockResolvedValue(inkUnit as never);
      vi.spyOn(productRepository, 'create').mockResolvedValue(mockProduct as never);

      const input = {
        lineId: 'line-id-1',
        unitId: 'unit-id-1',
        packSize: 1,
        colourId: 'colour-id-1',
        basePrice: 0,
        lowerStockLimit: 0,
      };
      const result = await productService.create(input);

      expect(productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lineId: 'line-id-1',
          unitId: 'unit-id-1',
          packSize: 1,
          colourId: 'colour-id-1',
          name: 'Premium UV Ink – Cyan – 1 LTR',
        })
      );
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundError when the product line does not exist', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(null);
      await expect(
        productService.create({
          lineId: 'missing-line',
          unitId: 'unit-id-1',
          packSize: 1,
          basePrice: 0,
          lowerStockLimit: 0,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when the unit does not exist', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(inkLine as never);
      vi.spyOn(unitRepository, 'findById').mockResolvedValue(null);
      await expect(
        productService.create({
          lineId: 'line-id-1',
          unitId: 'missing-unit',
          packSize: 1,
          basePrice: 0,
          lowerStockLimit: 0,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError when the unit does not apply to the line kind', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(inkLine as never);
      vi.spyOn(unitRepository, 'findById').mockResolvedValue(machineUnit as never);
      await expect(
        productService.create({
          lineId: 'line-id-1',
          unitId: 'unit-id-2',
          packSize: 1,
          basePrice: 0,
          lowerStockLimit: 0,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when packSize is missing for an INK product', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(inkLine as never);
      vi.spyOn(unitRepository, 'findById').mockResolvedValue(inkUnit as never);
      await expect(
        productService.create({
          lineId: 'line-id-1',
          unitId: 'unit-id-1',
          basePrice: 0,
          lowerStockLimit: 0,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when colour is required (role.usesColours) but missing', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(inkLine as never);
      vi.spyOn(unitRepository, 'findById').mockResolvedValue(inkUnit as never);
      await expect(
        productService.create({
          lineId: 'line-id-1',
          unitId: 'unit-id-1',
          packSize: 1,
          basePrice: 0,
          lowerStockLimit: 0,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when the colour does not belong to the line colour set', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(inkLine as never);
      vi.spyOn(unitRepository, 'findById').mockResolvedValue(inkUnit as never);
      await expect(
        productService.create({
          lineId: 'line-id-1',
          unitId: 'unit-id-1',
          packSize: 1,
          colourId: 'not-in-set',
          basePrice: 0,
          lowerStockLimit: 0,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should allow an INK product on a role that does not use colours, without a colourId', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(inkLineNoColours as never);
      vi.spyOn(unitRepository, 'findById').mockResolvedValue(inkUnit as never);
      vi.spyOn(productRepository, 'create').mockResolvedValue(mockProduct as never);

      await productService.create({
        lineId: 'line-id-2',
        unitId: 'unit-id-1',
        packSize: 1,
        basePrice: 0,
        lowerStockLimit: 0,
      });

      expect(productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ colourId: null })
      );
    });

    it('should create a MACHINE product using the given name, and reject packSize/colourId', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(machineLine as never);
      vi.spyOn(unitRepository, 'findById').mockResolvedValue(machineUnit as never);
      vi.spyOn(productRepository, 'create').mockResolvedValue(mockProduct as never);

      await productService.create({
        lineId: 'line-id-3',
        unitId: 'unit-id-2',
        name: 'Konica 512i Printer Unit A',
        basePrice: 0,
        lowerStockLimit: 0,
      });

      expect(productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Konica 512i Printer Unit A', packSize: null, colourId: null })
      );
    });

    it('should throw BadRequestError when name is missing for a MACHINE product', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(machineLine as never);
      vi.spyOn(unitRepository, 'findById').mockResolvedValue(machineUnit as never);
      await expect(
        productService.create({
          lineId: 'line-id-3',
          unitId: 'unit-id-2',
          basePrice: 0,
          lowerStockLimit: 0,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when packSize is set for a MACHINE product', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(machineLine as never);
      vi.spyOn(unitRepository, 'findById').mockResolvedValue(machineUnit as never);
      await expect(
        productService.create({
          lineId: 'line-id-3',
          unitId: 'unit-id-2',
          name: 'Printer',
          packSize: 1,
          basePrice: 0,
          lowerStockLimit: 0,
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('update', () => {
    it('should update a product when found', async () => {
      const updated = { ...mockProduct, name: 'Updated Name' };
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(inkLine as never);
      vi.spyOn(unitRepository, 'findById').mockResolvedValue(inkUnit as never);
      vi.spyOn(productRepository, 'update').mockResolvedValue(updated as never);

      const result = await productService.update('prod-id-1', {});
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundError if product does not exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(null);
      await expect(productService.update('bad-id', { name: 'X' })).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if the (possibly changed) product line does not exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(null);
      await expect(
        productService.update('prod-id-1', { lineId: 'missing-line' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError when colour is required but missing on update', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue({
        ...mockProduct,
        colourId: null,
      } as never);
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(inkLine as never);
      vi.spyOn(unitRepository, 'findById').mockResolvedValue(inkUnit as never);
      await expect(productService.update('prod-id-1', {})).rejects.toThrow(BadRequestError);
    });
  });

  describe('delete', () => {
    it('should soft-delete a product with no stock and no challans', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProductNoStock as never);
      vi.spyOn(productRepository, 'hasOpenChallans').mockResolvedValue(false);
      vi.spyOn(productRepository, 'softDelete').mockResolvedValue(mockProductNoStock as never);
      await productService.delete('prod-id-1');
      expect(productRepository.softDelete).toHaveBeenCalledWith('prod-id-1');
    });

    it('should throw NotFoundError if product does not exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(null);
      await expect(productService.delete('bad-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError with PRODUCT_HAS_STOCK if stock > 0', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      await expect(productService.delete('prod-id-1')).rejects.toThrow(
        expect.objectContaining({ code: 'PRODUCT_HAS_STOCK' })
      );
    });

    it('should throw BadRequestError with PRODUCT_HAS_OPEN_CHALLANS if challans exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProductNoStock as never);
      vi.spyOn(productRepository, 'hasOpenChallans').mockResolvedValue(true);
      await expect(productService.delete('prod-id-1')).rejects.toThrow(
        expect.objectContaining({ code: 'PRODUCT_HAS_OPEN_CHALLANS' })
      );
    });
  });

  describe('getStock', () => {
    it('should return stock info for an existing product', async () => {
      const stockData = {
        current: 10,
        lowerLimit: 2,
        isLow: false,
        transactions: [],
      };
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      vi.spyOn(productRepository, 'getStock').mockResolvedValue(stockData);
      const result = await productService.getStock('prod-id-1');
      expect(result).toEqual(stockData);
    });

    it('should throw NotFoundError if product does not exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(null);
      await expect(productService.getStock('bad-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock for valid quantity', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      vi.spyOn(productRepository, 'adjustStock').mockResolvedValue(mockProduct as never);
      await productService.adjustStock('prod-id-1', { quantity: 5, reason: 'ADJUSTMENT' });
      expect(productRepository.adjustStock).toHaveBeenCalledWith('prod-id-1', 5, 'ADJUSTMENT');
    });

    it('should throw BadRequestError with INSUFFICIENT_STOCK when stock goes below 0', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as never);
      await expect(
        productService.adjustStock('prod-id-1', { quantity: -100, reason: 'ADJUSTMENT' })
      ).rejects.toThrow(expect.objectContaining({ code: 'INSUFFICIENT_STOCK' }));
    });

    it('should throw NotFoundError if product does not exist', async () => {
      vi.spyOn(productRepository, 'findById').mockResolvedValue(null);
      await expect(
        productService.adjustStock('bad-id', { quantity: 5, reason: 'ADJUSTMENT' })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
