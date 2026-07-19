import { describe, it, expect } from 'vitest';
import {
  canonicalizeFolderName,
  extractCity,
  extractFirmNameFromFolder,
  resolveFirmName,
  slugify,
  GST_INVOICE_ONLY_CUSTOMERS,
} from './customer-matcher';

describe('canonicalizeFolderName', () => {
  it('resolves known GST-invoice-folder typos to the canonical ledger folder name', () => {
    expect(canonicalizeFolderName('Artistic Glass Wordl, Baroda')).toBe(
      'Artistic Glass World, Baroda'
    );
    expect(canonicalizeFolderName('Vandan Print House, Mehsna')).toBe(
      'Vandan Print House, Mehsana'
    );
    expect(canonicalizeFolderName('Shree Chamunda  Glass, Mehsana')).toBe(
      'Shri Chamunda Glass, Mehsana'
    );
  });

  it('resolves "Arjun Art, Bhuj" to "Arjun Flex, Bhuj" (verified same customer)', () => {
    expect(canonicalizeFolderName('Arjun Art, Bhuj')).toBe('Arjun Flex, Bhuj');
  });

  it('passes through an already-canonical name unchanged', () => {
    expect(canonicalizeFolderName('Elite Media, Surat')).toBe('Elite Media, Surat');
  });

  it('trims whitespace before lookup', () => {
    expect(canonicalizeFolderName('  Elite Media, Surat  ')).toBe('Elite Media, Surat');
  });
});

describe('extractCity / extractFirmNameFromFolder', () => {
  it('splits folder name on the last comma', () => {
    expect(extractCity('Artistic Glass World, Baroda')).toBe('Baroda');
    expect(extractFirmNameFromFolder('Artistic Glass World, Baroda')).toBe('Artistic Glass World');
  });

  it('handles a folder name with no comma before it (no space variant)', () => {
    expect(extractCity('Shyam Print,Jamkhambhalia')).toBe('Jamkhambhalia');
    expect(extractFirmNameFromFolder('Shyam Print,Jamkhambhalia')).toBe('Shyam Print');
  });

  it('returns null city when there is no comma at all', () => {
    expect(extractCity('NoCommaHere')).toBeNull();
  });
});

describe('resolveFirmName', () => {
  it('prefers the ledger in-sheet header over the folder name', () => {
    expect(
      resolveFirmName({
        folderName: 'Sai Enterprise, Mehsana',
        ledgerHeaderName: 'Sri Sai Enterprise, Mehsana',
      })
    ).toBe('Sri Sai Enterprise');
  });

  it('prefers a GST invoice buyer name over the folder name when no ledger header exists', () => {
    expect(
      resolveFirmName({
        folderName: 'Bhumi Graphics, Rajkot',
        gstInvoiceBuyerName: 'Bhumi Graphics',
      })
    ).toBe('Bhumi Graphics');
  });

  it('falls back to the folder name when no other source is available', () => {
    expect(resolveFirmName({ folderName: 'Elite Media, Surat' })).toBe('Elite Media');
  });
});

describe('slugify', () => {
  it('produces a stable, collision-resistant key from a firm name and city', () => {
    expect(slugify("D'Era Furnishing, Rajkot")).toBe('d-era-furnishing-rajkot');
  });
});

describe('GST_INVOICE_ONLY_CUSTOMERS', () => {
  it('lists exactly the 3 genuinely orphaned customers (not Arjun Art, which is Arjun Flex)', () => {
    expect(GST_INVOICE_ONLY_CUSTOMERS).toHaveLength(3);
    expect(GST_INVOICE_ONLY_CUSTOMERS).not.toContain('Arjun Art, Bhuj');
  });
});
