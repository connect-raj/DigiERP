import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { proxy, config } from './proxy';
import { signToken } from '@/lib/auth-utils';
import { __resetRateLimitStore } from '@/lib/rate-limit';

describe('proxy matcher', () => {
  it('matches page routes', () => {
    expect(unstable_doesMiddlewareMatch({ config, url: '/' })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: '/customers' })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: '/login' })).toBe(true);
  });

  it('matches business API routes', () => {
    expect(unstable_doesMiddlewareMatch({ config, url: '/api/customers' })).toBe(true);
  });

  it('excludes public auth routes', () => {
    expect(unstable_doesMiddlewareMatch({ config, url: '/api/auth/login' })).toBe(false);
  });

  it('excludes Next internals and static assets', () => {
    expect(unstable_doesMiddlewareMatch({ config, url: '/_next/static/chunk.js' })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: '/_next/image?url=x' })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: '/favicon.ico' })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: '/next.svg' })).toBe(false);
  });
});

describe('proxy (auth + redirects)', () => {
  beforeEach(() => {
    __resetRateLimitStore();
  });

  it('returns 401 when no session token is present', async () => {
    const res = await proxy(new NextRequest('https://app.test/api/customers'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.message).toBe('Unauthorized: No session token found');
  });

  it('returns 401 for an invalid token', async () => {
    const req = new NextRequest('https://app.test/api/customers', {
      headers: { cookie: 'session-token=not-a-valid-token' },
    });
    const res = await proxy(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.message).toBe('Unauthorized: Invalid or expired token');
  });

  it('passes through with a valid session token', async () => {
    const token = signToken({ id: 'u1', username: 'admin', role: 'admin' });
    const req = new NextRequest('https://app.test/api/customers', {
      headers: { cookie: `session-token=${token}` },
    });
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });

  it('redirects an unauthenticated page request to /login with a from param', async () => {
    const req = new NextRequest('https://app.test/customers');
    const res = await proxy(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).not.toBeNull();
    const url = new URL(location!);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('from')).toBe('/customers');
  });

  it('preserves nested paths and query strings in the from param', async () => {
    const req = new NextRequest('https://app.test/invoices/42?tab=payments');
    const res = await proxy(req);
    expect(res.status).toBe(307);
    const url = new URL(res.headers.get('location')!);
    expect(url.searchParams.get('from')).toBe('/invoices/42?tab=payments');
  });

  it('redirects an unauthenticated root request to /login without a from param', async () => {
    const req = new NextRequest('https://app.test/');
    const res = await proxy(req);
    expect(res.status).toBe(307);
    const url = new URL(res.headers.get('location')!);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.has('from')).toBe(false);
  });

  it('passes through an unauthenticated /login request', async () => {
    const req = new NextRequest('https://app.test/login');
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });

  it('redirects an authenticated /login request to /', async () => {
    const token = signToken({ id: 'u1', username: 'admin', role: 'admin' });
    const req = new NextRequest('https://app.test/login', {
      headers: { cookie: `session-token=${token}` },
    });
    const res = await proxy(req);
    expect(res.status).toBe(307);
    const url = new URL(res.headers.get('location')!);
    expect(url.pathname).toBe('/');
  });

  it('passes through an authenticated page request', async () => {
    const token = signToken({ id: 'u1', username: 'admin', role: 'admin' });
    const req = new NextRequest('https://app.test/customers', {
      headers: { cookie: `session-token=${token}` },
    });
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });
});
