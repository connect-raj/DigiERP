import { TaxClass } from '@prisma/client';
import { BadRequestError } from '@/lib/errors';

/**
 * A product that carries an optional tax-class override plus its parent line's tax class.
 * Callers must have included both `taxClass` and `line.taxClass` in their Prisma query.
 */
export interface TaxClassAwareProduct {
  taxClassId: string | null;
  taxClass?: TaxClass | null;
  line: {
    taxClass: TaxClass;
  };
}

/**
 * Resolves the tax class that actually applies to a product: the product's own
 * override if set, otherwise its line's tax class.
 */
export function getEffectiveTaxClass(product: TaxClassAwareProduct): TaxClass {
  return product.taxClass ?? product.line.taxClass;
}

/**
 * Guards against invoicing (or purchasing) with a tax class that has no HSN code
 * configured — an HSN code is required on the document, so this must block earlier
 * rather than produce an invalid document.
 */
export function assertHasHsnCode(taxClass: TaxClass, productName: string): void {
  if (!taxClass.hsnCode || taxClass.hsnCode.trim() === '') {
    throw new BadRequestError(
      `Cannot invoice '${productName}': its tax class '${taxClass.name}' has no HSN code set.`,
      'TAX_CLASS_MISSING_HSN'
    );
  }
}
