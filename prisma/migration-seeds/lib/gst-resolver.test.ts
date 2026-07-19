import { describe, it, expect } from 'vitest';
import { resolveFromInvoiceFile, backCalculateGst, splitExplicitGstAmount } from './gst-resolver';

describe('resolveFromInvoiceFile', () => {
  it('passes through exact figures from a matched GST invoice file unchanged', () => {
    // Real figures cross-checked against So Fine Art bill #14's GST invoice.
    const result = resolveFromInvoiceFile({ taxableValue: 19000, cgst: 1710, sgst: 1710, igst: 0 });
    expect(result).toEqual({
      taxableValue: 19000,
      cgst: 1710,
      sgst: 1710,
      igst: 0,
      source: 'GST_INVOICE_FILE',
    });
  });
});

describe('backCalculateGst', () => {
  it('back-calculates an in-state (CGST/SGST) split from a GST-inclusive amount', () => {
    // 19000 taxable + 1710 CGST + 1710 SGST = 22420 inclusive at 18%.
    const result = backCalculateGst(22420, 18, 'Gujarat');
    expect(result.source).toBe('BACK_CALCULATED');
    expect(result.taxableValue).toBeCloseTo(19000, 0);
    expect(result.cgst).toBeCloseTo(1710, 0);
    expect(result.sgst).toBeCloseTo(1710, 0);
    expect(result.igst).toBe(0);
  });

  it('produces an IGST-only split for an out-of-state customer', () => {
    const result = backCalculateGst(22420, 18, 'Maharashtra');
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBeCloseTo(3420, 0);
  });

  it('defaults to the company state (Gujarat, in-state) when no customer state is given', () => {
    const result = backCalculateGst(11800, 18);
    expect(result.igst).toBe(0);
    expect(result.cgst).toBeGreaterThan(0);
  });
});

describe('splitExplicitGstAmount', () => {
  it('splits an already-known total GST amount evenly across CGST/SGST for an in-state customer', () => {
    // Vandan Print House printer sale: taxable 1425000, stated GST 256500.
    const result = splitExplicitGstAmount(1425000, 256500, 'Gujarat');
    expect(result.source).toBe('EXPLICIT_LEDGER_LINE');
    expect(result.cgst).toBe(128250);
    expect(result.sgst).toBe(128250);
    expect(result.igst).toBe(0);
  });

  it('routes the full amount to IGST for an out-of-state customer', () => {
    const result = splitExplicitGstAmount(1425000, 256500, 'Rajasthan');
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(256500);
  });
});
