import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashApiKey, generateRawApiKey, verifyIngestionApiKey } from './api-key';
import prisma from '@/lib/prisma';
import { UnauthorizedError } from '@/lib/errors';

vi.mock('@/lib/prisma', () => ({
  default: {
    ingestionApiKey: {
      findUnique: vi.fn(),
    },
  },
}));

describe('hashApiKey', () => {
  it('is deterministic for the same input', () => {
    expect(hashApiKey('abc')).toBe(hashApiKey('abc'));
  });

  it('differs for different inputs', () => {
    expect(hashApiKey('abc')).not.toBe(hashApiKey('abd'));
  });
});

describe('generateRawApiKey', () => {
  it('generates a high-entropy hex string', () => {
    const key = generateRawApiKey();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(generateRawApiKey()).not.toBe(key);
  });
});

describe('verifyIngestionApiKey', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws Unauthorized when no key is provided', async () => {
    await expect(verifyIngestionApiKey(null)).rejects.toThrow(UnauthorizedError);
  });

  it('throws Unauthorized when the key hash matches no record', async () => {
    vi.mocked(prisma.ingestionApiKey.findUnique).mockResolvedValue(null);
    await expect(verifyIngestionApiKey('bad-key')).rejects.toThrow(UnauthorizedError);
  });

  it('throws Unauthorized when the matched key is inactive', async () => {
    vi.mocked(prisma.ingestionApiKey.findUnique).mockResolvedValue({
      id: 'key-1',
      label: 'Expo microsite',
      source: 'EXPO',
      keyHash: hashApiKey('revoked-key'),
      active: false,
      createdAt: new Date(),
    } as never);
    await expect(verifyIngestionApiKey('revoked-key')).rejects.toThrow(UnauthorizedError);
  });

  it('returns the source for a valid, active key, looked up by hash', async () => {
    vi.mocked(prisma.ingestionApiKey.findUnique).mockResolvedValue({
      id: 'key-1',
      label: 'Expo microsite',
      source: 'EXPO',
      keyHash: hashApiKey('good-key'),
      active: true,
      createdAt: new Date(),
    } as never);

    const result = await verifyIngestionApiKey('good-key');

    expect(result).toEqual({ source: 'EXPO', apiKeyId: 'key-1' });
    expect(prisma.ingestionApiKey.findUnique).toHaveBeenCalledWith({
      where: { keyHash: hashApiKey('good-key') },
    });
  });
});
