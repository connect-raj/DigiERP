import { determineGstType } from '@/lib/gst';
import { COMPANY_STATE } from '@/lib/constants';

export interface GstSplit {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  source: 'GST_INVOICE_FILE' | 'BACK_CALCULATED' | 'EXPLICIT_LEDGER_LINE';
}

/**
 * Exact CGST/SGST/taxable-value figures read from a matched GST invoice
 * file - preferred source of truth when available.
 */
export interface ExactGstFigures {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
}

/** Resolves GST for a bill when an exact matching GST invoice file exists. */
export function resolveFromInvoiceFile(figures: ExactGstFigures): GstSplit {
  return { ...figures, source: 'GST_INVOICE_FILE' };
}

/**
 * Back-calculates CGST/SGST/IGST from a GST-inclusive ledger Debit total,
 * using the matched category's gstRate - the fallback path when no GST
 * invoice file matches a bill (including the 2 PDF invoice files this
 * archive has, which can't be parsed as structured data).
 */
export function backCalculateGst(
  inclusiveAmount: number,
  gstRatePercent: number,
  customerState: string = COMPANY_STATE
): GstSplit {
  const taxableValue = inclusiveAmount / (1 + gstRatePercent / 100);
  const gstType = determineGstType(COMPANY_STATE, customerState);
  const totalGst = inclusiveAmount - taxableValue;

  if (gstType === 'IGST') {
    return { taxableValue, cgst: 0, sgst: 0, igst: totalGst, source: 'BACK_CALCULATED' };
  }
  const half = totalGst / 2;
  return { taxableValue, cgst: half, sgst: half, igst: 0, source: 'BACK_CALCULATED' };
}

/**
 * Splits an already-known total GST amount (Printer segment's explicit
 * "GST 18%" ledger row) into CGST/SGST or IGST - no back-calculation
 * needed since the ledger already states the exact tax figure.
 */
export function splitExplicitGstAmount(
  taxableValue: number,
  totalGstAmount: number,
  customerState: string = COMPANY_STATE
): GstSplit {
  const gstType = determineGstType(COMPANY_STATE, customerState);
  if (gstType === 'IGST') {
    return { taxableValue, cgst: 0, sgst: 0, igst: totalGstAmount, source: 'EXPLICIT_LEDGER_LINE' };
  }
  const half = totalGstAmount / 2;
  return { taxableValue, cgst: half, sgst: half, igst: 0, source: 'EXPLICIT_LEDGER_LINE' };
}
