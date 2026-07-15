/**
 * Sanitizes a post-login return path. Parses via the WHATWG URL API rather
 * than string-prefix checks, so protocol-relative (`//evil.com`), backslash
 * (`/\evil.com`), and scheme-relative variants all resolve to a mismatched
 * origin and fall back to `/` instead of slipping through.
 */
export function sanitizeReturnTo(raw: string | null, origin: string): string {
  if (!raw) return '/';
  try {
    const url = new URL(raw, origin);
    return url.origin === origin ? url.pathname + url.search : '/';
  } catch {
    return '/';
  }
}
