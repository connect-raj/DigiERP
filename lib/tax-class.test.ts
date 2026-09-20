import { describe, it, expect } from 'vitest';
import { getEffectiveTaxClass, assertHasHsnCode, TaxClassAwareProduct } from './tax-class';
import { BadRequestError } from './errors';
import { TaxClass } from '@prisma/client';

const lineTaxClass = { id: 'tc-line', name: 'Line Tax Class', hsnCode: '3215' } as TaxClass;
const ownTaxClass = { id: 'tc-own', name: 'Own Tax Class', hsnCode: '3216' } as TaxClass;

describe('getEffectiveTaxClass', () => {
  it("returns the product's own tax class when set", () => {
    const product: TaxClassAwareProduct = {
      taxClassId: 'tc-own',
      taxClass: ownTaxClass,
      line: { taxClass: lineTaxClass },
    };
    expect(getEffectiveTaxClass(product)).toBe(ownTaxClass);
  });

  it("falls back to the line's tax class when the product has no override", () => {
    const product: TaxClassAwareProduct = {
      taxClassId: null,
      taxClass: null,
      line: { taxClass: lineTaxClass },
    };
    expect(getEffectiveTaxClass(product)).toBe(lineTaxClass);
  });
});

describe('assertHasHsnCode', () => {
  it('throws BadRequestError with code TAX_CLASS_MISSING_HSN when hsnCode is null', () => {
    const taxClass = { id: 'tc-1', name: 'No HSN', hsnCode: null } as unknown as TaxClass;
    expect(() => assertHasHsnCode(taxClass, 'Some Product')).toThrow(BadRequestError);
    try {
      assertHasHsnCode(taxClass, 'Some Product');
      throw new Error('expected assertHasHsnCode to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestError);
      expect((error as BadRequestError).code).toBe('TAX_CLASS_MISSING_HSN');
    }
  });

  it('throws BadRequestError with code TAX_CLASS_MISSING_HSN when hsnCode is blank', () => {
    const taxClass = { id: 'tc-1', name: 'Blank HSN', hsnCode: '   ' } as TaxClass;
    expect(() => assertHasHsnCode(taxClass, 'Some Product')).toThrow(BadRequestError);
  });

  it('passes silently when hsnCode is set', () => {
    const taxClass = { id: 'tc-1', name: 'Has HSN', hsnCode: '3215' } as TaxClass;
    expect(() => assertHasHsnCode(taxClass, 'Some Product')).not.toThrow();
  });
});
