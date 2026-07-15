import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
// Next 16.2.9 still ships this under the `Middleware` name (the `proxy` rename
// is documented but the testing helper has not been renamed in this build).
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { proxy, config } from './proxy';
import { signToken } from '@/lib/auth-utils';
import { __resetRateLimitStore } from '@/lib/rate-limit';

describe('proxy (auth + matcher)', () => {
  beforeEach(() => {
    __resetRateLimitStore();
  });

  it('matches business API routes', () => {
    expect(unstable_doesMiddlewareMatch({ config, url: '/api/customers' })).toBe(true);
  });

  it('excludes public auth routes', () => {
    expect(unstable_doesMiddlewareMatch({ config, url: '/api/auth/login' })).toBe(false);
  });

  it('returns 401 when no session token is present', async () => {
    const res = await proxy(new NextRequest('https://app.test/api/customers'));
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const req = new NextRequest('https://app.test/api/customers', {
      headers: { cookie: 'session-token=not-a-valid-token' },
    });
    const res = await proxy(req);
    expect(res.status).toBe(401);
  });

  it('passes through with a valid session token', async () => {
    const token = signToken({ id: 'u1', username: 'admin', role: 'admin' });
    const req = new NextRequest('https://app.test/api/customers', {
      headers: { cookie: `session-token=${token}` },
    });
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });
});
