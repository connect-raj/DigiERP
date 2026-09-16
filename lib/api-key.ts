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

/** Generates a new random raw API key (returned to the caller exactly once). */
export function generateRawApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
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
