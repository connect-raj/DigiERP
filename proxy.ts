import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { rateLimit, clientKeyFromHeaders } from '@/lib/rate-limit';

/**
 * Global request Proxy (Next.js 16 — formerly `middleware`). Runs on the Node.js
 * runtime, so it can use the Node `crypto`-based `verifyToken` directly.
 *
 * Enforces authentication and basic rate limiting on every business API route.
 * `/api/auth/*` (login/register/logout) is excluded via the matcher and an
 * in-function guard so credentials can be exchanged before a session exists.
 */

function jsonError(code: string, message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth endpoints stay public even if the matcher ever widens.
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Rate limiting, keyed by client IP.
  const rl = rateLimit(clientKeyFromHeaders(request.headers));
  if (!rl.allowed) {
    const retryAfter = Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return jsonError('RATE_LIMITED', 'Too many requests. Please slow down.', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  // Authentication.
  const token = request.cookies.get('session-token')?.value;
  if (!token) {
    return jsonError('UNAUTHORIZED', 'Unauthorized: No session token found', 401);
  }
  if (!verifyToken(token)) {
    return jsonError('UNAUTHORIZED', 'Unauthorized: Invalid or expired token', 401);
  }

  return NextResponse.next();
}

export const config = {
  // Every /api route except the public auth endpoints (negative lookahead — a
  // positive `/api/:path*` cannot subtract a subpath).
  matcher: '/api/((?!auth/).*)',
};
