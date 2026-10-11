import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { InquirySource } from '@prisma/client';
import { UnauthorizedError } from '@/lib/errors';

/** Deterministic, non-reversible digest used to look up an IngestionApiKey by
 * an exact indexed match — no per-key timing-safe scan needed. SHA-256 (not a
 * slow password hash) is appropriate here: ingestion keys are high-entropy
 * random secrets, not user-chosen passwords. */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/** Key-type prefixes, OpenAI/Anthropic-style (`sk-ing-...`, `sk-pub-...`) — lets
 * the key's type be read at a glance (logs, error messages, secret scanners)
 * without a DB lookup. */
export const API_KEY_PREFIXES = {
  ingestion: 'sk-ing',
  public: 'sk-pub',
} as const;

/** Generates a new random raw API key (returned to the caller exactly once),
 * as `<prefix>-<secret>` where secret is 32 random bytes, base64url-encoded. */
export function generateRawApiKey(prefix: string): string {
  const secret = crypto.randomBytes(32).toString('base64url');
  return `${prefix}-${secret}`;
}

/**
 * Verifies an ingestion API key and returns the source it's scoped to. The
 * source is always derived from the matched key — never trusted from the
 * request body — so a compromised expo-form key can be revoked without
 * affecting the website form, and no submission can claim a source it
 * doesn't hold the key for.
 */
export async function verifyIngestionApiKey(
  rawKey: string | null
): Promise<{ source: InquirySource; apiKeyId: string }> {
  if (!rawKey) {
    throw new UnauthorizedError('Unauthorized: Missing API key');
  }

  const apiKey = await prisma.ingestionApiKey.findUnique({
    where: { keyHash: hashApiKey(rawKey) },
  });

  if (!apiKey || !apiKey.active) {
    throw new UnauthorizedError('Unauthorized: Invalid or inactive API key');
  }

  return { source: apiKey.source, apiKeyId: apiKey.id };
}

/**
 * Verifies a public (read-scoped) API key for the marketing-site-facing
 * routes under app/api/public/*. Separate model from IngestionApiKey (see
 * PublicApiKey in schema.prisma) — this is a read credential, not scoped to
 * an inquiry source.
 */
export async function verifyPublicApiKey(rawKey: string | null): Promise<{ apiKeyId: string }> {
  if (!rawKey) {
    throw new UnauthorizedError('Unauthorized: Missing API key');
  }

  const apiKey = await prisma.publicApiKey.findUnique({
    where: { keyHash: hashApiKey(rawKey) },
  });

  if (!apiKey || !apiKey.active) {
    throw new UnauthorizedError('Unauthorized: Invalid or inactive API key');
  }

  return { apiKeyId: apiKey.id };
}
