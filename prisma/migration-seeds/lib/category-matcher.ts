/**
 * Maps a raw ledger Particulars string (e.g. "Ricoh Gen5 UV Hybrid Ink
 * C-1,M-1,Y-1,K-1") to one of the categories seeded in prisma/seed.ts, plus
 * the per-color quantities encoded in the same string.
 *
 * Deterministic, ordered rules only - no fuzzy/similarity matching. Text
 * that doesn't confidently match any rule is returned as unmatched rather
 * than guessed, so it surfaces in the migration report for manual review.
 */

export interface ColorQuantity {
  code: string;
  name: string;
  qty: number;
}

export interface CategoryMatch {
  categoryName: string;
  colors: ColorQuantity[];
}

const COLOR_CODE_NAMES: Record<string, string> = {
  C: 'Cyan',
  M: 'Magenta',
  Y: 'Yellow',
  K: 'Black',
  W: 'White',
  V: 'Varnish',
  F: 'Flush',
  S: 'S',
  MY: 'Mustard Yellow',
  LY: 'Lime Yellow',
};

/** Extracts "C-1,M-1,Y-1,K-1"-style color/quantity pairs from Particulars text. */
export function extractColorQuantities(text: string): ColorQuantity[] {
  const results: ColorQuantity[] = [];
  const re = /\b([A-Za-z]{1,2})\s*-\s*(\d+(?:\.\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const code = m[1].toUpperCase();
    const qty = Number(m[2]);
    const name = COLOR_CODE_NAMES[code];
    if (name && Number.isFinite(qty)) {
      results.push({ code, name, qty });
    }
  }
  return results;
}

interface Rule {
  test: (t: string) => boolean;
  categoryName: string;
}

const has = (t: string, re: RegExp) => re.test(t);

const RULES: Rule[] = [
  // Platinum
  {
    test: (t) => has(t, /platinum/i) && has(t, /512i/i) && has(t, /flush/i),
    categoryName: 'Platinum Konica 512i Solvent Flush',
  },
  {
    test: (t) => has(t, /platinum/i) && has(t, /512i/i),
    categoryName: 'Platinum Konica 512i Solvent Ink',
  },
  {
    test: (t) => has(t, /platinum/i) && has(t, /1024/i) && has(t, /flush/i),
    categoryName: 'Platinum Konica 1024i Solvent Flush',
  },
  {
    test: (t) => has(t, /platinum/i) && has(t, /1024/i),
    categoryName: 'Platinum Konica 1024i Solvent Ink',
  },
  {
    test: (t) => has(t, /platinum/i) && has(t, /xaar/i) && has(t, /flush/i),
    categoryName: 'Platinum Xaar Solvent Flush',
  },
  {
    test: (t) => has(t, /platinum/i) && has(t, /xaar/i),
    categoryName: 'Platinum Xaar Solvent Ink',
  },
  {
    test: (t) => has(t, /platinum/i) && has(t, /eco/i) && has(t, /flush/i),
    categoryName: 'Platinum Eco Solvent Flush',
  },
  { test: (t) => has(t, /platinum/i) && has(t, /eco/i), categoryName: 'Platinum Eco Solvent Ink' },
  { test: (t) => has(t, /platinum/i), categoryName: 'Platinum Solvent Ink' },

  // Premium
  {
    test: (t) => has(t, /premium/i) && has(t, /konica/i) && has(t, /flush/i),
    categoryName: 'Premium Konica Solvent Flush',
  },
  {
    test: (t) => has(t, /premium/i) && has(t, /konica/i),
    categoryName: 'Premium Konica Solvent Ink',
  },
  {
    test: (t) => has(t, /premium/i) && has(t, /xaar/i) && has(t, /flush/i),
    categoryName: 'Premium Xaar Solvent Flush',
  },
  { test: (t) => has(t, /premium/i) && has(t, /xaar/i), categoryName: 'Premium Xaar Solvent Ink' },
  { test: (t) => has(t, /premium/i), categoryName: 'Premium Solvent Ink' },

  // Max
  {
    test: (t) => has(t, /\bmax\b/i) && has(t, /konica/i) && has(t, /1024/i),
    categoryName: 'Max Konica 1024i Solvent Ink',
  },
  { test: (t) => has(t, /\bmax\b/i) && has(t, /konica/i), categoryName: 'Max Konica Solvent Ink' },
  { test: (t) => has(t, /\bmax\b/i), categoryName: 'Max Solvent Ink' },

  // Allwin (no generic fallback - the taxonomy has no unqualified "Allwin
  // Solvent Ink" category, so an Allwin mention with no recognized
  // sub-keyword is left unmatched rather than guessed)
  { test: (t) => has(t, /allwin/i) && has(t, /eco/i), categoryName: 'Allwin Eco Solvent Ink' },
  {
    test: (t) => has(t, /allwin/i) && has(t, /512i/i),
    categoryName: 'Allwin Konica 512i Solvent Ink',
  },
  { test: (t) => has(t, /allwin/i) && has(t, /soft/i), categoryName: 'Allwin UV Soft Ink' },
  { test: (t) => has(t, /allwin/i) && has(t, /\buv\b/i), categoryName: 'Allwin UV Ink' },
  {
    test: (t) => has(t, /allwin/i) && has(t, /konica/i),
    categoryName: 'Allwin Konica Solvent Ink',
  },

  // Toyo
  { test: (t) => has(t, /toyo/i), categoryName: 'Toyo Ink (Solvent)' },

  // Ricoh (cross-brand UV) - Gen5/GH2220 must be identified explicitly, a
  // bare "Ricoh" mention with neither is ambiguous and left unmatched
  { test: (t) => has(t, /ricoh/i) && has(t, /gen\s*5/i), categoryName: 'Ricoh Gen5 UV Hybrid Ink' },
  {
    test: (t) => has(t, /ricoh/i) && has(t, /gh\s*2220/i),
    categoryName: 'Ricoh GH2220 UV Hybrid Ink',
  },

  // Konica (UV line, no brand prefix)
  {
    test: (t) => has(t, /konica/i) && has(t, /\buv\b/i) && !has(t, /ricoh/i),
    categoryName: 'Konica 1024A UV Ink',
  },

  // Other
  { test: (t) => has(t, /\bsj\b/i), categoryName: 'SJ UV Ink' },
  { test: (t) => has(t, /universal/i) && has(t, /\buv\b/i), categoryName: 'Universal UV Ink' },
  { test: (t) => has(t, /inktec/i), categoryName: 'Inktec UV Ink' },
  { test: (t) => has(t, /\bjapan\b/i) && has(t, /\buv\b/i), categoryName: 'Japan UV Ink' },
  { test: (t) => has(t, /glass\s*coat/i), categoryName: 'Glass Coating' },
  {
    test: (t) => has(t, /eco\s*premium\s*cart(r?i?adge|radge|ridge)/i),
    categoryName: 'Eco Premium Cartridge',
  },

  // Generic (brand-unspecified) fallbacks - tried last, only fire when no
  // brand-specific rule above already matched. Validated against real
  // FY2026-27 data: customers frequently order these with no brand named.
  { test: (t) => has(t, /solvent/i) && has(t, /flush/i), categoryName: 'Solvent Flush' },
  { test: (t) => has(t, /\buv\b/i) && has(t, /flush/i), categoryName: 'UV Flush' },
  { test: (t) => has(t, /eco/i) && has(t, /solvent/i), categoryName: 'Eco Solvent Ink' },
  { test: (t) => has(t, /\buv\b/i), categoryName: 'UV Ink' },
];

/**
 * Matches Particulars text to a seeded category and extracts per-color
 * quantities. Returns null (unmatched) rather than guessing when no rule
 * fires - callers should log unmatched text to the migration review report.
 */
export function matchCategory(particulars: string): CategoryMatch | null {
  const text = particulars.trim();
  if (!text) return null;

  const rule = RULES.find((r) => r.test(text));
  if (!rule) return null;

  return {
    categoryName: rule.categoryName,
    colors: extractColorQuantities(text),
  };
}
