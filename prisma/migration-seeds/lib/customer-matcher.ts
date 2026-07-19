/**
 * Canonicalizes customer identity across the three FY2026-27 name sources
 * (Account/INK folder, Account/Printer folder, Invoice/GST Inovice folder),
 * which don't always agree due to typos and spacing differences. Uses an
 * explicit, hardcoded alias map only - never fuzzy/similarity matching -
 * because a wrong merge or split of two real customers is a financial
 * correctness bug, not just a display nit.
 *
 * "Arjun Art, Bhuj" (GST-invoice-folder name) was verified by cross-checking
 * the buyer name/address printed inside the GST invoice file against the
 * matching trailing note in the "Arjun Flex, Bhuj" ledger file - they are
 * the same real customer, not a 4th orphan as initially assumed.
 */

const FOLDER_NAME_ALIASES: Record<string, string> = {
  'Artistic Glass Wordl, Baroda': 'Artistic Glass World, Baroda',
  'Max Tine Poster Co, Ahmedabad': 'Max Tin Poster, Ahmedabad',
  'Shree Chamunda  Glass, Mehsana': 'Shri Chamunda Glass, Mehsana',
  'Shyam Print, Jamkhambhalia': 'Shyam Print,Jamkhambhalia',
  'So Fine Art , Rajkot': 'So Fine Art, Rajkot',
  'Vandan Print House, Mehsna': 'Vandan Print House, Mehsana',
  'Viral Graphics, Morbi': 'Viral Graphics,Morbi',
  'Arjun Art, Bhuj': 'Arjun Flex, Bhuj',
};

/** GST-invoice-only customers with genuinely no ledger folder this year. */
export const GST_INVOICE_ONLY_CUSTOMERS = [
  'Bhumi Graphics, Rajkot',
  'Omkar Digital Technology, Ahmedabad',
  'Radhe CMYK, Surat',
] as const;

export const REX_TONE_INDUSTRIES_FOLDER = 'Rex Tone Industries, Por';

/** Resolves any raw folder name to its canonical ledger-folder-name form. */
export function canonicalizeFolderName(rawName: string): string {
  const trimmed = rawName.trim();
  return FOLDER_NAME_ALIASES[trimmed] ?? trimmed;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractCity(folderName: string): string | null {
  const idx = folderName.lastIndexOf(',');
  if (idx === -1) return null;
  const city = folderName.slice(idx + 1).trim();
  return city || null;
}

export function extractFirmNameFromFolder(folderName: string): string {
  const idx = folderName.lastIndexOf(',');
  return (idx === -1 ? folderName : folderName.slice(0, idx)).trim();
}

/**
 * Resolves the canonical firmName for a customer, preferring the ledger's
 * own in-sheet header or a GST invoice's buyer name over the folder name -
 * per the confirmed FY2026-27 mismatches (folder "Sai Enterprise" -> ledger
 * header "Sri Sai Enterprise"; folder "So Fine Art" -> ledger header
 * "So Fine Trading").
 */
export function resolveFirmName(opts: {
  folderName: string;
  ledgerHeaderName?: string | null;
  gstInvoiceBuyerName?: string | null;
}): string {
  const candidate = opts.ledgerHeaderName?.trim() || opts.gstInvoiceBuyerName?.trim();
  if (candidate) {
    const idx = candidate.lastIndexOf(',');
    const stripped = (idx === -1 ? candidate : candidate.slice(0, idx)).trim();
    return stripped || candidate;
  }
  return extractFirmNameFromFolder(opts.folderName);
}
