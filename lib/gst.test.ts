import { describe, it, expect } from 'vitest';
import { determineGstType } from './gst';

describe('determineGstType', () => {
  it('should return CGST_SGST for same state', () => {
    expect(determineGstType('Gujarat', 'Gujarat')).toBe('CGST_SGST');
    expect(determineGstType(' gujarat ', 'Gujarat')).toBe('CGST_SGST');
  });

  it('should return IGST for different states', () => {
    expect(determineGstType('Gujarat', 'Maharashtra')).toBe('IGST');
  });
});
