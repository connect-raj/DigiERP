import * as XLSX from 'xlsx';

export type SheetCell = string | number | Date | null;
export type SheetRow = SheetCell[];

export interface WorkbookSheet {
  name: string;
  rows: SheetRow[];
}

/**
 * Reads every sheet in a workbook as arrays of raw cell values (header: 1),
 * so callers can locate header rows by content rather than assuming a fixed
 * layout - ledger files in this archive don't have a consistent column count
 * or sheet count.
 */
export function readAllSheets(filePath: string): WorkbookSheet[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });
    return { name, rows };
  });
}

/**
 * A sheet has real ledger data (vs. an always-blank Sheet2/Sheet3 template)
 * if it contains a "Total" marker cell - every real ledger sheet in this
 * archive ends with Total/Total Credit summary rows, blank sheets never do.
 */
export function isRealLedgerSheet(rows: SheetRow[]): boolean {
  return rows.some((row) =>
    row.some((cell) => typeof cell === 'string' && cell.trim().toLowerCase() === 'total')
  );
}
