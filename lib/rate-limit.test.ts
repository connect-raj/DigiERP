import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, clientKeyFromHeaders, __resetRateLimitStore } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    __resetRateLimitStore();
  });

  it('allows requests under the limit', () => {
    const first = rateLimit('ip-1', 3, 60_000);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);

    expect(rateLimit('ip-1', 3, 60_000).allowed).toBe(true);
    expect(rateLimit('ip-1', 3, 60_000).allowed).toBe(true);
  });

  it('blocks requests once the limit is exceeded within the window', () => {
    rateLimit('ip-2', 2, 60_000);
    rateLimit('ip-2', 2, 60_000);
    const blocked = rateLimit('ip-2', 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('tracks separate keys independently', () => {
    rateLimit('ip-a', 1, 60_000);
    expect(rateLimit('ip-a', 1, 60_000).allowed).toBe(false);
    expect(rateLimit('ip-b', 1, 60_000).allowed).toBe(true);
  });

  it('resets after the window elapses', () => {
    rateLimit('ip-3', 1, -1); // window already in the past
    expect(rateLimit('ip-3', 1, 60_000).allowed).toBe(true);
  });
});

describe('clientKeyFromHeaders', () => {
  it('uses the first x-forwarded-for entry', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' });
    expect(clientKeyFromHeaders(headers)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip then unknown', () => {
    expect(clientKeyFromHeaders(new Headers({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(clientKeyFromHeaders(new Headers())).toBe('unknown');
  });
});
