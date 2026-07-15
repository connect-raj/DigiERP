import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { rateLimit, clientKeyFromHeaders } from '@/lib/rate-limit';

/**
 * Global request Proxy (Next.js 16 — formerly `middleware`). Runs on the Node.js
 * runtime, so it can use the Node `crypto`-based `verifyToken` directly.
 *
 * Enforces authentication on every page and business API route, plus basic rate
 * limiting on API calls. `/api/auth/*` (login/register/logout) is excluded via
 * the matcher and an in-function guard so credentials can be exchanged before a
 * session exists. Unauthenticated page requests are redirected to `/login`
 * (an "optimistic" UI-level check per Next's proxy guidance); the API layer
 * remains the authoritative data-access gate.
 */

function jsonError(code: string, message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');

  // Auth endpoints stay public even if the matcher ever widens.
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Rate limiting applies to API calls only — page navigations shouldn't
  // consume the same budget.
  if (isApi) {
    const rl = rateLimit(clientKeyFromHeaders(request.headers));
    if (!rl.allowed) {
      const retryAfter = Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000));
      return jsonError('RATE_LIMITED', 'Too many requests. Please slow down.', 429, {
        'Retry-After': String(retryAfter),
      });
    }
  }

  const token = request.cookies.get('session-token')?.value;
  const isAuthed = token != null && verifyToken(token) !== null;

  if (pathname === '/login') {
    return isAuthed ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }

  if (!isAuthed) {
    if (isApi) {
      const message =
        token == null
          ? 'Unauthorized: No session token found'
          : 'Unauthorized: Invalid or expired token';
      return jsonError('UNAUTHORIZED', message, 401);
    }
    const loginUrl = new URL('/login', request.url);
    const target = pathname + request.nextUrl.search;
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', target);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Every route except the public auth API, Next internals, and static assets
  // (negative lookahead — a positive catch-all can't subtract these subpaths).
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|css|js)$).*)',
  ],
};
