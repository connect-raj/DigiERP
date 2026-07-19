import type { SheetCell, SheetRow } from './xlsx-reader';

export type MigrationPaymentMode = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI' | 'OTHER';

export interface ParsedLineItem {
  particulars: string;
  qty: number | null;
  rate: number | null;
  debitAmount: number;
}

export interface ParsedDebitBlock {
  kind: 'BILLED' | 'UNBILLED';
  billNo: string | null;
  date: Date;
  items: ParsedLineItem[];
  debitAmount: number;
  gstAmount: number | null;
  notes: string[];
  sourceRowIndexes: number[];
}

export interface ParsedOpeningBalance {
  amount: number;
  date: Date | null;
  rawText: string;
  sourceRowIndex: number;
}

export interface ParsedAdjustment {
  kind: 'INK_RETURN' | 'CHEQUE_RETURN' | 'DISCOUNT';
  amount: number;
  date: Date | null;
  rawText: string;
  sourceRowIndex: number;
}

export interface ParsedPayment {
  date: Date;
  billNo: string | null;
  amount: number;
  mode: MigrationPaymentMode;
  rawModeText: string;
  sourceRowIndex: number;
}

export interface UnparsedRow {
  rowIndex: number;
  reason: string;
  raw: SheetRow;
}

export interface ParsedSheetResult {
  debitBlocks: ParsedDebitBlock[];
  openingBalances: ParsedOpeningBalance[];
  adjustments: ParsedAdjustment[];
  payments: ParsedPayment[];
  statedTotalDebit: number | null;
  statedTotalCredit: number | null;
  unparsedRows: UnparsedRow[];
}

// pr[ei]vi?ous covers "previous", "privious", and "privous" typo variants
// all in one pattern.
const OPENING_BALANCE_RE = /last\s*year\s*due|pr[ei]vi?ous\s*year\s*due|agal\s*na\s*baki/i;
const INK_RETURN_RE = /ink\s*ret[uw]?rn/i;
const CHEQUE_RETURN_RE = /cheque\s*ret[uw]?rn|cheque\s*retrurn/i;
const GST_LINE_RE = /^\s*gst\b/i;
const DISCOUNT_RE = /^\s*discount\s*$/i;

function normCell(cell: SheetCell): string {
  if (typeof cell === 'string') return cell.trim();
  if (typeof cell === 'number') return String(cell);
  return '';
}

function normLower(cell: SheetCell): string {
  return normCell(cell).toLowerCase();
}

function parseDateCell(cell: SheetCell): Date | null {
  if (cell instanceof Date) return cell;
  const text = normCell(cell);
  const m = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNumberCell(cell: SheetCell): number | null {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null;
  const text = normCell(cell);
  if (text === '' || text === '=') return null;
  const cleaned = text.replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function inferPaymentMode(rawText: string): MigrationPaymentMode {
  const t = rawText.toLowerCase();
  if (t.includes('cash')) return 'CASH';
  if (t.includes('cheque') || t.includes('chq')) return 'CHEQUE';
  if (t.includes('upi') || t.includes('bhim')) return 'UPI';
  if (t.includes('neft') || t.includes('rtgs') || t.includes('imps') || t.includes('bank')) {
    return 'BANK_TRANSFER';
  }
  return 'OTHER';
}

interface ColumnMap {
  debitDateIdx: number;
  billIdx: number;
  particularsIdx: number;
  qtyIdx: number;
  rateIdx: number;
  debitIdx: number;
  creditDateIdx: number;
  creditBillIdx: number;
  creditParticularsIdx: number;
  cashChequeIdx: number;
  creditIdx: number;
}

function findHeaderRowIndex(rows: SheetRow[]): number {
  return rows.findIndex(
    (row) => row.some((c) => normLower(c) === 'date') && row.some((c) => normLower(c) === 'debit')
  );
}

function detectColumns(headerRow: SheetRow): ColumnMap {
  const dateIndexes: number[] = [];
  headerRow.forEach((c, i) => {
    if (normLower(c) === 'date') dateIndexes.push(i);
  });
  if (dateIndexes.length < 2) {
    throw new Error('Could not locate two "Date" header columns (debit side + credit side)');
  }
  const [debitDateIdx, creditDateIdx] = dateIndexes;

  const findIn = (from: number, to: number, name: string): number => {
    for (let i = from; i < to && i < headerRow.length; i++) {
      if (normLower(headerRow[i]) === name) return i;
    }
    return -1;
  };

  return {
    debitDateIdx,
    billIdx: findIn(debitDateIdx, creditDateIdx, 'bill'),
    particularsIdx: findIn(debitDateIdx, creditDateIdx, 'perticuler'),
    qtyIdx: findIn(debitDateIdx, creditDateIdx, 'qty'),
    rateIdx: findIn(debitDateIdx, creditDateIdx, 'rate'),
    debitIdx: findIn(debitDateIdx, creditDateIdx, 'debit'),
    creditDateIdx,
    creditBillIdx: findIn(creditDateIdx, headerRow.length, 'bill'),
    creditParticularsIdx: findIn(creditDateIdx, headerRow.length, 'perticuler'),
    cashChequeIdx: findIn(creditDateIdx, headerRow.length, 'cash/cheque'),
    creditIdx: findIn(creditDateIdx, headerRow.length, 'credit'),
  };
}

function parseDebitSide(
  rows: SheetRow[],
  dataStart: number,
  cols: ColumnMap,
  unparsedRows: UnparsedRow[]
): {
  blocks: ParsedDebitBlock[];
  openingBalances: ParsedOpeningBalance[];
  adjustments: ParsedAdjustment[];
  statedTotalDebit: number | null;
} {
  const blocks: ParsedDebitBlock[] = [];
  const blocksByBillNo = new Map<string, ParsedDebitBlock>();
  const openingBalances: ParsedOpeningBalance[] = [];
  const adjustments: ParsedAdjustment[] = [];
  let statedTotalDebit: number | null = null;
  let currentBlock: ParsedDebitBlock | null = null;

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    const label = normLower(row[0]);
    if (label === 'total') {
      statedTotalDebit = cols.debitIdx >= 0 ? parseNumberCell(row[cols.debitIdx]) : null;
      currentBlock = null;
      continue;
    }
    if (label === 'total credit') {
      // Informational outstanding-for-the-year figure, not part of the core
      // debit/credit checksum - intentionally not consumed here.
      currentBlock = null;
      continue;
    }

    const date = parseDateCell(row[cols.debitDateIdx]);
    const billCell = cols.billIdx >= 0 ? row[cols.billIdx] : null;
    const billNo = normCell(billCell) || null;
    const particulars = cols.particularsIdx >= 0 ? normCell(row[cols.particularsIdx]) : '';
    const qty = cols.qtyIdx >= 0 ? parseNumberCell(row[cols.qtyIdx]) : null;
    const rate = cols.rateIdx >= 0 ? parseNumberCell(row[cols.rateIdx]) : null;
    const debit = cols.debitIdx >= 0 ? parseNumberCell(row[cols.debitIdx]) : null;

    const hasDebitSideContent =
      date !== null || billNo !== null || particulars !== '' || (debit ?? 0) > 0;
    if (!hasDebitSideContent) {
      continue;
    }

    if (particulars && OPENING_BALANCE_RE.test(particulars)) {
      openingBalances.push({
        amount: debit ?? 0,
        date,
        rawText: particulars,
        sourceRowIndex: i,
      });
      currentBlock = null;
      continue;
    }

    if (particulars && INK_RETURN_RE.test(particulars)) {
      adjustments.push({
        kind: 'INK_RETURN',
        amount: debit ?? 0,
        date,
        rawText: particulars,
        sourceRowIndex: i,
      });
      currentBlock = null;
      continue;
    }

    if (particulars && GST_LINE_RE.test(particulars)) {
      if (currentBlock && (debit ?? 0) > 0) {
        currentBlock.gstAmount = (currentBlock.gstAmount ?? 0) + (debit as number);
        currentBlock.debitAmount += debit as number;
        currentBlock.sourceRowIndexes.push(i);
      } else {
        unparsedRows.push({ rowIndex: i, reason: 'GST line with no open block', raw: row });
      }
      continue;
    }

    if ((debit ?? 0) > 0 && particulars !== '') {
      // A bill can have its line items split across multiple non-contiguous
      // rows sharing the same Bill No (e.g. two separate product lines both
      // billed under #4) - merge into the existing block for that bill
      // rather than starting a duplicate one, which would collide on
      // DispatchEntry.challanNo downstream.
      const existingBlock = billNo ? blocksByBillNo.get(billNo) : undefined;
      if (existingBlock) {
        existingBlock.items.push({ particulars, qty, rate, debitAmount: debit as number });
        existingBlock.debitAmount += debit as number;
        existingBlock.sourceRowIndexes.push(i);
        currentBlock = existingBlock;
        continue;
      }

      currentBlock = {
        kind: billNo ? 'BILLED' : 'UNBILLED',
        billNo,
        date: date ?? new Date(NaN),
        items: [{ particulars, qty, rate, debitAmount: debit as number }],
        debitAmount: debit as number,
        gstAmount: null,
        notes: [],
        sourceRowIndexes: [i],
      };
      blocks.push(currentBlock);
      if (billNo) blocksByBillNo.set(billNo, currentBlock);
      continue;
    }

    if ((debit ?? 0) === 0 || debit === null) {
      if (particulars !== '' && currentBlock) {
        // Continuation / spec line for the currently open block (e.g. printhead
        // spec text on its own row) - preserved for audit, not a new item.
        currentBlock.notes.push(particulars);
        currentBlock.sourceRowIndexes.push(i);
        continue;
      }
      if (particulars !== '' && qty === null && rate !== null) {
        // Zero-debit template/placeholder row (blank Date, no Bill, no Qty) -
        // noise padding, not a real transaction.
        continue;
      }
    }

    unparsedRows.push({ rowIndex: i, reason: 'Unclassified debit-side row', raw: row });
    currentBlock = null;
  }

  return { blocks, openingBalances, adjustments, statedTotalDebit };
}

function parseCreditSide(
  rows: SheetRow[],
  dataStart: number,
  cols: ColumnMap,
  unparsedRows: UnparsedRow[]
): {
  payments: ParsedPayment[];
  adjustments: ParsedAdjustment[];
  statedTotalCredit: number | null;
} {
  const payments: ParsedPayment[] = [];
  const adjustments: ParsedAdjustment[] = [];
  let statedTotalCredit: number | null = null;

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    const debitLabel = normLower(row[0]);
    if (debitLabel === 'total' || debitLabel === 'total credit') {
      if (cols.creditIdx >= 0 && normLower(row[cols.creditDateIdx]) === 'total') {
        statedTotalCredit = parseNumberCell(row[cols.creditIdx]);
      }
      continue;
    }

    const date = parseDateCell(row[cols.creditDateIdx]);
    const billNo = cols.creditBillIdx >= 0 ? normCell(row[cols.creditBillIdx]) || null : null;
    const particulars =
      cols.creditParticularsIdx >= 0 ? normCell(row[cols.creditParticularsIdx]) : '';
    const cashCheque = cols.cashChequeIdx >= 0 ? normCell(row[cols.cashChequeIdx]) : '';
    const credit = cols.creditIdx >= 0 ? parseNumberCell(row[cols.creditIdx]) : null;

    const hasCreditSideContent =
      date !== null || particulars !== '' || cashCheque !== '' || (credit ?? 0) > 0;
    if (!hasCreditSideContent) continue;

    if (CHEQUE_RETURN_RE.test(particulars) || CHEQUE_RETURN_RE.test(cashCheque)) {
      adjustments.push({
        kind: 'CHEQUE_RETURN',
        amount: credit ?? 0,
        date,
        rawText: particulars || cashCheque,
        sourceRowIndex: i,
      });
      continue;
    }

    if ((credit ?? 0) > 0 && DISCOUNT_RE.test(cashCheque)) {
      adjustments.push({
        kind: 'DISCOUNT',
        amount: credit as number,
        date,
        rawText: particulars || cashCheque,
        sourceRowIndex: i,
      });
      continue;
    }

    if ((credit ?? 0) > 0 && date !== null) {
      payments.push({
        date,
        billNo,
        amount: credit as number,
        mode: inferPaymentMode(cashCheque),
        rawModeText: cashCheque,
        sourceRowIndex: i,
      });
      continue;
    }

    if ((credit ?? 0) === 0 || credit === null) {
      // Blank/trailing-note row on the credit side (e.g. a stray installment
      // reminder note with no amount) - noise, not a transaction.
      continue;
    }

    unparsedRows.push({ rowIndex: i, reason: 'Unclassified credit-side row', raw: row });
  }

  return { payments, adjustments, statedTotalCredit };
}

/**
 * Parses one real ledger sheet (debit side = dispatches/invoices, credit
 * side = payments/adjustments, laid out side-by-side per row) into
 * classified records. Debit-side rows are grouped into blocks: a block
 * starts at a row with a positive Debit and non-GST Particulars, and absorbs
 * any immediately-following continuation/GST rows - this is required for
 * Printer-segment sales, which span a product row + spec-description rows +
 * a separate "GST 18%" row, none of which carry a Bill No.
 */
export function parseLedgerSheet(rows: SheetRow[]): ParsedSheetResult {
  const headerIdx = findHeaderRowIndex(rows);
  if (headerIdx === -1) {
    throw new Error('Could not locate a header row containing "Date" and "Debit"');
  }
  const cols = detectColumns(rows[headerIdx]);
  const dataStart = headerIdx + 1;
  const unparsedRows: UnparsedRow[] = [];

  const debitResult = parseDebitSide(rows, dataStart, cols, unparsedRows);
  const creditResult = parseCreditSide(rows, dataStart, cols, unparsedRows);

  return {
    debitBlocks: debitResult.blocks,
    openingBalances: debitResult.openingBalances,
    adjustments: [...debitResult.adjustments, ...creditResult.adjustments],
    payments: creditResult.payments,
    statedTotalDebit: debitResult.statedTotalDebit,
    statedTotalCredit: creditResult.statedTotalCredit,
    unparsedRows,
  };
}
