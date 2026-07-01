import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-only-123456';

/**
 * Hashes a plain text password using PBKDF2 with a random salt.
 * Returns a salt-colon-hash string.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain text password against a stored salt-colon-hash string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

/**
 * Signs a payload as a stateless JWT string.
 */
export function signToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * Verifies a token, returning the decoded payload or null if invalid.
 */
export function verifyToken(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (signature !== expectedSignature) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Removes passwordHash property from a user object type-safely.
 */
export function omitPassword<T extends { passwordHash: string }>(user: T): Omit<T, 'passwordHash'> {
  const copy = { ...user } as Omit<T, 'passwordHash'> & { passwordHash?: string };
  delete copy.passwordHash;
  return copy;
}
