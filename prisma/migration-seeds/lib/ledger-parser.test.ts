import { describe, it, expect } from 'vitest';
import { parseLedgerSheet } from './ledger-parser';
import type { SheetRow } from './xlsx-reader';

const INK_HEADER: SheetRow = [
  'Date',
  'Bill',
  'Perticuler',
  'Qty',
  'Rate',
  'Debit',
  'Date',
  'Bill',
  'Perticuler',
  'Cash/Cheque',
  'Credit',
];

const PRINTER_HEADER: SheetRow = [
  'Date',
  'Bill',
  'Perticuler',
  'Qty',
  'Rate',
  'Debit',
  'Date',
  'Perticuler',
  'Cash/Cheque',
  'Credit',
];

function sheet(
  title: string,
  header: SheetRow,
  dataRows: SheetRow[],
  totalRow: SheetRow
): SheetRow[] {
  return [[title], header, ...dataRows, totalRow];
}

describe('parseLedgerSheet - INK segment', () => {
  it('classifies a billed row (has Bill No) as a BILLED block', () => {
    const rows = sheet(
      'Cust',
      INK_HEADER,
      [
        [
          '22.04.2026',
          10,
          'Ricoh Gen5 UV Hybrid Ink C-1,M-1,Y-1,K-1',
          4,
          4012,
          16048,
          '22.04.2026',
          10,
          'ink amt',
          'Neft',
          16048,
        ],
      ],
      ['Total', null, null, null, null, 16048, 'Total', null, null, null, 16048]
    );
    const result = parseLedgerSheet(rows);
    expect(result.debitBlocks).toHaveLength(1);
    expect(result.debitBlocks[0].kind).toBe('BILLED');
    expect(result.debitBlocks[0].billNo).toBe('10');
    expect(result.debitBlocks[0].debitAmount).toBe(16048);
    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].mode).toBe('BANK_TRANSFER');
  });

  it('merges non-contiguous rows sharing the same Bill No into one block instead of two', () => {
    const rows = sheet(
      'Cust',
      INK_HEADER,
      [
        [
          '13.04.2026',
          4,
          'UV Inks Konica C-3',
          3,
          4130,
          12390,
          '25.04.2026',
          4,
          'ink amt',
          'Neft',
          45843,
        ],
        [
          '13.04.2026',
          4,
          'UV Inks Konica M-2,Y-6,K-1',
          9,
          3717,
          33453,
          null,
          null,
          null,
          null,
          null,
        ],
      ],
      ['Total', null, null, null, null, 45843, 'Total', null, null, null, 45843]
    );
    const result = parseLedgerSheet(rows);
    expect(result.debitBlocks).toHaveLength(1);
    expect(result.debitBlocks[0].billNo).toBe('4');
    expect(result.debitBlocks[0].items).toHaveLength(2);
    expect(result.debitBlocks[0].debitAmount).toBe(45843);
  });

  it('classifies a row with no Bill No as an UNBILLED block', () => {
    const rows = sheet(
      'Cust',
      INK_HEADER,
      [
        [
          '24.06.2026',
          null,
          'Ricoh Gen5 UV ink C-1,M-1,Y-1,K-1',
          4,
          4720,
          18880,
          null,
          null,
          null,
          null,
          null,
        ],
      ],
      ['Total', null, null, null, null, 18880, 'Total', null, null, null, 0]
    );
    const result = parseLedgerSheet(rows);
    expect(result.debitBlocks).toHaveLength(1);
    expect(result.debitBlocks[0].kind).toBe('UNBILLED');
    expect(result.debitBlocks[0].billNo).toBeNull();
  });

  it('absorbs zero-debit continuation/noise rows into the preceding block as notes, not new blocks', () => {
    const rows = sheet(
      'Cust',
      INK_HEADER,
      [
        [
          '24.06.2026',
          null,
          'Ricoh Gen5 UV ink C-1,M-1,Y-1,K-1',
          4,
          4720,
          18880,
          null,
          null,
          null,
          null,
          null,
        ],
        [null, null, 'Ricoh Gen5 UV Hybrid Ink W-2', null, 5310, 0, null, null, null, null, null],
        [null, null, 'UV Flush', null, 3540, 0, null, null, null, null, null],
      ],
      ['Total', null, null, null, null, 18880, 'Total', null, null, null, 0]
    );
    const result = parseLedgerSheet(rows);
    expect(result.debitBlocks).toHaveLength(1);
    expect(result.debitBlocks[0].notes).toEqual(['Ricoh Gen5 UV Hybrid Ink W-2', 'UV Flush']);
  });

  it('classifies "Last Year Due" as an opening balance, not a block', () => {
    const rows = sheet(
      'Cust',
      INK_HEADER,
      [['01.04.2026', null, 'Last Year Due', null, null, 5000, null, null, null, null, null]],
      ['Total', null, null, null, null, 5000, 'Total', null, null, null, 0]
    );
    const result = parseLedgerSheet(rows);
    expect(result.debitBlocks).toHaveLength(0);
    expect(result.openingBalances).toHaveLength(1);
    expect(result.openingBalances[0].amount).toBe(5000);
  });

  it('classifies "Privous Year Due" (typo) as an opening balance too', () => {
    const rows = sheet(
      'Cust',
      INK_HEADER,
      [['01.04.2026', null, 'Privous Year Due', null, null, 3000, null, null, null, null, null]],
      ['Total', null, null, null, null, 3000, 'Total', null, null, null, 0]
    );
    const result = parseLedgerSheet(rows);
    expect(result.openingBalances).toHaveLength(1);
  });

  it('classifies "ink Return" as a negative adjustment, not a block', () => {
    const rows = sheet(
      'Cust',
      INK_HEADER,
      [['10.05.2026', null, 'ink Return', null, null, 1200, null, null, null, null, null]],
      ['Total', null, null, null, null, 1200, 'Total', null, null, null, 0]
    );
    const result = parseLedgerSheet(rows);
    expect(result.debitBlocks).toHaveLength(0);
    expect(result.adjustments).toHaveLength(1);
    expect(result.adjustments[0].kind).toBe('INK_RETURN');
  });

  it('classifies a "Discount" credit-column value as a write-down adjustment, not a Payment', () => {
    const rows = sheet(
      'Cust',
      INK_HEADER,
      [
        [
          null,
          null,
          null,
          null,
          null,
          null,
          '15.06.2026',
          null,
          'Printer Amt.',
          'Discount',
          100000,
        ],
      ],
      ['Total', null, null, null, null, 0, 'Total', null, null, null, 100000]
    );
    const result = parseLedgerSheet(rows);
    expect(result.payments).toHaveLength(0);
    expect(result.adjustments).toHaveLength(1);
    expect(result.adjustments[0].kind).toBe('DISCOUNT');
    expect(result.adjustments[0].amount).toBe(100000);
  });

  it('computes the checksum totals matching the stated Total/Total Credit rows', () => {
    const rows = sheet(
      'Cust',
      INK_HEADER,
      [
        [
          '22.04.2026',
          10,
          'Ricoh Gen5 UV Hybrid Ink C-1,M-1,Y-1,K-1',
          4,
          4012,
          16048,
          '22.04.2026',
          10,
          'ink amt',
          'Neft',
          16048,
        ],
        [
          '24.06.2026',
          null,
          'Ricoh Gen5 UV ink C-1,M-1,Y-1,K-1',
          4,
          4720,
          18880,
          '24.06.2026',
          null,
          'ink amt',
          'Neft',
          18800,
        ],
      ],
      ['Total', null, null, null, null, 34928, 'Total', null, null, null, 34848]
    );
    const result = parseLedgerSheet(rows);
    expect(result.statedTotalDebit).toBe(34928);
    expect(result.statedTotalCredit).toBe(34848);
    const computedDebit = result.debitBlocks.reduce((a, b) => a + b.debitAmount, 0);
    const computedCredit = result.payments.reduce((a, b) => a + b.amount, 0);
    expect(computedDebit).toBe(34928);
    expect(computedCredit).toBe(34848);
  });
});

describe('parseLedgerSheet - Printer segment (no Bill No, multi-row blocks)', () => {
  it('groups a product row + spec-continuation row + separate GST row into one UNBILLED block', () => {
    const rows = sheet(
      'Cust',
      PRINTER_HEADER,
      [
        [
          '06.05.2026',
          null,
          'Allwin Digital Inkjet Printer C8 pro',
          1,
          1425000,
          1425000,
          '06.05.2026',
          'Printer Amt.',
          'Neft',
          200000,
        ],
        [null, null, '1024i ,4 Head (30pl) 4 Color', null, null, null, null, null, null, null],
        [null, null, 'GST  18%   (10 Lakh )', null, 256500, 256500, null, null, null, null],
      ],
      ['Total', null, null, null, null, 1681500, 'Total', null, null, 200000]
    );
    const result = parseLedgerSheet(rows);
    expect(result.debitBlocks).toHaveLength(1);
    const block = result.debitBlocks[0];
    expect(block.kind).toBe('UNBILLED');
    expect(block.items).toHaveLength(1);
    expect(block.items[0].particulars).toBe('Allwin Digital Inkjet Printer C8 pro');
    expect(block.gstAmount).toBe(256500);
    expect(block.debitAmount).toBe(1681500);
    expect(block.notes).toEqual(['1024i ,4 Head (30pl) 4 Color']);
  });

  it("starts a new block when a second product row appears after the first block's GST row", () => {
    const rows = sheet(
      'Cust',
      PRINTER_HEADER,
      [
        [
          '06.05.2026',
          null,
          'Allwin Digital Inkjet Printer C8 pro',
          1,
          1425000,
          1425000,
          null,
          null,
          null,
          null,
        ],
        [null, null, 'GST  18%', null, 256500, 256500, null, null, null, null],
        [
          '06.05.2026',
          null,
          'Allwin A180S Eco Solvent Printer',
          1,
          550000,
          550000,
          null,
          null,
          null,
          null,
        ],
        [null, null, 'GST 18%', null, 99000, 99000, null, null, null, null],
      ],
      ['Total', null, null, null, null, 2330500, 'Total', null, null, 0]
    );
    const result = parseLedgerSheet(rows);
    expect(result.debitBlocks).toHaveLength(2);
    expect(result.debitBlocks[0].debitAmount).toBe(1681500);
    expect(result.debitBlocks[1].debitAmount).toBe(649000);
  });

  it('infers CASH/CHEQUE/UPI/OTHER payment modes correctly', () => {
    const rows = sheet(
      'Cust',
      PRINTER_HEADER,
      [
        [null, null, null, null, null, null, '01.05.2026', 'p1', 'Cash', 1000],
        [null, null, null, null, null, null, '02.05.2026', 'p2', 'Cheque', 2000],
        [null, null, null, null, null, null, '03.05.2026', 'p3', 'BHIM', 3000],
        [null, null, null, null, null, null, '04.05.2026', 'p4', 'Something Else', 4000],
      ],
      ['Total', null, null, null, null, 0, 'Total', null, null, 10000]
    );
    const result = parseLedgerSheet(rows);
    expect(result.payments.map((p) => p.mode)).toEqual(['CASH', 'CHEQUE', 'UPI', 'OTHER']);
  });
});

describe('parseLedgerSheet - noise handling', () => {
  it('skips fully blank rows without creating blocks or flagging them as unparsed', () => {
    const rows = sheet(
      'Cust',
      INK_HEADER,
      [
        ['22.04.2026', 10, 'Some Ink C-1', 1, 100, 100, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null],
      ],
      ['Total', null, null, null, null, 100, 'Total', null, null, null, 0]
    );
    const result = parseLedgerSheet(rows);
    expect(result.debitBlocks).toHaveLength(1);
    expect(result.unparsedRows).toHaveLength(0);
  });

  it('flags a stray noise row with no open block as unparsed rather than silently dropping it', () => {
    const rows = sheet(
      'Cust',
      PRINTER_HEADER,
      [
        [null, null, 'Ayush Patel : 70168 68253', null, null, null, null, null, null, null],
        ['01.05.2026', null, 'Some Product', 1, 500, 500, null, null, null, null],
      ],
      ['Total', null, null, null, null, 500, 'Total', null, null, 0]
    );
    const result = parseLedgerSheet(rows);
    // The stray note appears before any block has opened - zero Debit/Qty
    // and no open block to attach to as a continuation, so it must be
    // flagged for review, not silently dropped.
    expect(result.unparsedRows.some((r) => r.reason.includes('Unclassified'))).toBe(true);
    expect(result.debitBlocks).toHaveLength(1);
  });

  it("absorbs a stray noise row into an already-open block's notes rather than losing it (still traceable, just attributed differently)", () => {
    const rows = sheet(
      'Cust',
      PRINTER_HEADER,
      [
        ['01.05.2026', null, 'Some Product', 1, 500, 500, null, null, null, null],
        [null, null, 'Ayush Patel : 70168 68253', null, null, null, null, null, null, null],
      ],
      ['Total', null, null, null, null, 500, 'Total', null, null, 0]
    );
    const result = parseLedgerSheet(rows);
    expect(result.debitBlocks).toHaveLength(1);
    expect(result.debitBlocks[0].notes).toContain('Ayush Patel : 70168 68253');
    expect(result.unparsedRows).toHaveLength(0);
  });
});
