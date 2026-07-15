import { describe, it, expect } from 'vitest';
import { sanitizeReturnTo } from './safe-redirect';

const ORIGIN = 'https://app.test';

describe('sanitizeReturnTo', () => {
  it('returns / for null input', () => {
    expect(sanitizeReturnTo(null, ORIGIN)).toBe('/');
  });

  it('returns / for an empty string', () => {
    expect(sanitizeReturnTo('', ORIGIN)).toBe('/');
  });

  it('accepts a same-origin relative path', () => {
    expect(sanitizeReturnTo('/customers', ORIGIN)).toBe('/customers');
  });

  it('preserves a query string on the relative path', () => {
    expect(sanitizeReturnTo('/invoices/42?tab=payments', ORIGIN)).toBe('/invoices/42?tab=payments');
  });

  it('accepts a same-origin absolute URL', () => {
    expect(sanitizeReturnTo('https://app.test/vendors', ORIGIN)).toBe('/vendors');
  });

  it('rejects a protocol-relative URL to another host', () => {
    expect(sanitizeReturnTo('//evil.com', ORIGIN)).toBe('/');
  });

  it('rejects a backslash-variant host bypass', () => {
    expect(sanitizeReturnTo('/\\evil.com', ORIGIN)).toBe('/');
  });

  it('rejects a cross-origin absolute URL', () => {
    expect(sanitizeReturnTo('https://evil.com', ORIGIN)).toBe('/');
  });

  it('rejects a javascript: scheme payload', () => {
    expect(sanitizeReturnTo('javascript:alert(1)', ORIGIN)).toBe('/');
  });

  it('rejects malformed input', () => {
    expect(sanitizeReturnTo('http://[::1', ORIGIN)).toBe('/');
  });
});
