import { describe, it, expect } from 'vitest';
import { matchCategory, extractColorQuantities } from './category-matcher';

describe('extractColorQuantities', () => {
  it('extracts multiple color/qty pairs', () => {
    expect(extractColorQuantities('Ricoh Gen5 UV Hybrid Ink C-1,M-1,Y-1,K-1')).toEqual([
      { code: 'C', name: 'Cyan', qty: 1 },
      { code: 'M', name: 'Magenta', qty: 1 },
      { code: 'Y', name: 'Yellow', qty: 1 },
      { code: 'K', name: 'Black', qty: 1 },
    ]);
  });

  it('extracts a single color/qty pair with no comma list', () => {
    expect(extractColorQuantities('Ricoh Gen5 UV Hybrid Ink W-2')).toEqual([
      { code: 'W', name: 'White', qty: 2 },
    ]);
  });

  it('returns an empty array when no color tokens are present', () => {
    expect(extractColorQuantities('UV Flush')).toEqual([]);
  });
});

describe('matchCategory - real samples from FY2026-27 ledgers', () => {
  it('matches "Ricoh Gen5 UV Hybrid Ink C-1,M-1,Y-1,K-1"', () => {
    const result = matchCategory('Ricoh Gen5 UV Hybrid Ink C-1,M-1,Y-1,K-1');
    expect(result?.categoryName).toBe('Ricoh Gen5 UV Hybrid Ink');
    expect(result?.colors).toHaveLength(4);
  });

  it('matches lowercase "Ricoh Gen5 UV ink" variant spelling', () => {
    expect(matchCategory('Ricoh Gen5 UV ink C-1,M-1,Y-1,K-1')?.categoryName).toBe(
      'Ricoh Gen5 UV Hybrid Ink'
    );
  });

  it('matches "Glass Coating" with trailing whitespace', () => {
    expect(matchCategory('Glass Coating ')?.categoryName).toBe('Glass Coating');
  });

  it('matches "Allwin Digital Inkjet Printer C8 pro" as unmatched (not an ink category)', () => {
    // Printer models aren't part of the ink taxonomy - the runner handles
    // printer line items via a separate Printers category, not this matcher.
    expect(matchCategory('Allwin Digital Inkjet Printer C8 pro')).toBeNull();
  });
});

describe('matchCategory - brand/printhead/flush combinations', () => {
  it('distinguishes Platinum Konica 512i Ink vs Flush', () => {
    expect(matchCategory('Platinum Konica 512i Solvent Ink')?.categoryName).toBe(
      'Platinum Konica 512i Solvent Ink'
    );
    expect(matchCategory('Platinum Konica 512i Solvent Flush')?.categoryName).toBe(
      'Platinum Konica 512i Solvent Flush'
    );
  });

  it('falls back to generic "Platinum Solvent Ink" when no printhead is named', () => {
    expect(matchCategory('Platinum Ink C-5,M-5')?.categoryName).toBe('Platinum Solvent Ink');
  });

  it('maps Allwin + Eco to Allwin Eco Solvent Ink', () => {
    expect(matchCategory('Allwin Eco Solvent Ink C-3,M-5')?.categoryName).toBe(
      'Allwin Eco Solvent Ink'
    );
  });

  it('leaves a bare "Allwin" mention unmatched (no generic Allwin category exists)', () => {
    expect(matchCategory('Allwin Ink Refill')).toBeNull();
  });

  it('leaves a bare "Ricoh" mention (no Gen5/GH2220) unmatched rather than guessing', () => {
    expect(matchCategory('Ricoh Ink C-1,M-1')).toBeNull();
  });

  it('maps Konica + UV (no Ricoh) to Konica 1024A UV Ink', () => {
    expect(matchCategory('Konica UV Ink C-1,M-1')?.categoryName).toBe('Konica 1024A UV Ink');
  });

  it('matches a bare "SJ Ink" mention without requiring "UV" (real ledger spelling)', () => {
    expect(matchCategory('SJ Ink C-3,M-4,Y-2,K-3')?.categoryName).toBe('SJ UV Ink');
  });
});

describe('matchCategory - generic (brand-unspecified) fallbacks', () => {
  it('maps a bare "Solvent Flush" (no brand) to the generic Solvent Flush category', () => {
    expect(matchCategory('Solvent Flush')?.categoryName).toBe('Solvent Flush');
  });

  it('maps a bare "UV Flush" (no brand) to the generic UV Flush category', () => {
    expect(matchCategory('UV Flush')?.categoryName).toBe('UV Flush');
  });

  it('maps a bare "Eco Solvent Ink" (no brand) to the generic Eco Solvent Ink category', () => {
    expect(matchCategory('Eco Solvent Ink C-3,Y-4,K-3')?.categoryName).toBe('Eco Solvent Ink');
  });

  it('maps bare "UV inks" / "UV Flexibel" (typo) mentions to the generic UV Ink category', () => {
    expect(matchCategory('UV inks C-6,M-4,Y-7,K-1')?.categoryName).toBe('UV Ink');
    expect(matchCategory('UV Flexibel Inks M-1')?.categoryName).toBe('UV Ink');
  });

  it('still prefers a brand-specific match over the generic fallback when a brand is present', () => {
    expect(matchCategory('Platinum Eco Solvent Ink')?.categoryName).toBe(
      'Platinum Eco Solvent Ink'
    );
    expect(matchCategory('Allwin UV Ink')?.categoryName).toBe('Allwin UV Ink');
  });
});

describe('matchCategory - unmatched/noise text', () => {
  it('returns null for empty or whitespace-only text', () => {
    expect(matchCategory('')).toBeNull();
    expect(matchCategory('   ')).toBeNull();
  });

  it('returns null for noise text that matches no category', () => {
    expect(matchCategory('TIN No. 24072400341')).toBeNull();
    expect(matchCategory('Jalpeshbhai : 99792 34962')).toBeNull();
  });
});
