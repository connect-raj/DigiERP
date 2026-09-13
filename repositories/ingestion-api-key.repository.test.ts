import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestionApiKeyRepository } from './ingestion-api-key.repository';
import prisma from '@/lib/prisma';
import { hashApiKey } from '@/lib/api-key';

vi.mock('@/lib/prisma', () => ({
  default: {
    ingestionApiKey: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('IngestionApiKeyRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('generates a raw key, stores only its (matching) hash, and returns the raw key once', async () => {
      vi.mocked(prisma.ingestionApiKey.create).mockImplementation(((args: { data: object }) =>
        Promise.resolve({
          id: 'key-1',
          ...args.data,
        })) as unknown as typeof prisma.ingestionApiKey.create);

      const result = await ingestionApiKeyRepository.create({
        label: 'Expo microsite',
        source: 'EXPO',
      });

      expect(result.rawKey).toMatch(/^[0-9a-f]{64}$/);
      expect(prisma.ingestionApiKey.create).toHaveBeenCalledWith({
        data: {
          label: 'Expo microsite',
          source: 'EXPO',
          keyHash: hashApiKey(result.rawKey),
        },
        select: expect.objectContaining({ id: true, label: true }),
      });
      // The raw key itself must never be sent to prisma for storage.
      const createArgs = vi.mocked(prisma.ingestionApiKey.create).mock.calls[0][0];
      expect(JSON.stringify(createArgs)).not.toContain(result.rawKey);
    });

    it('never selects keyHash back out of prisma', async () => {
      vi.mocked(prisma.ingestionApiKey.create).mockResolvedValue({ id: 'key-1' } as never);
      await ingestionApiKeyRepository.create({ label: 'Expo microsite', source: 'EXPO' });

      const createArgs = vi.mocked(prisma.ingestionApiKey.create).mock.calls[0][0];
      expect(createArgs.select).not.toHaveProperty('keyHash');
    });
  });

  describe('findAll', () => {
    it('never selects keyHash back out of prisma', async () => {
      vi.mocked(prisma.ingestionApiKey.findMany).mockResolvedValue([]);
      await ingestionApiKeyRepository.findAll();

      const findArgs = vi.mocked(prisma.ingestionApiKey.findMany).mock.calls[0][0];
      expect(findArgs?.select).not.toHaveProperty('keyHash');
    });
  });

  describe('update', () => {
    it('updates an existing key without selecting keyHash back out', async () => {
      vi.mocked(prisma.ingestionApiKey.update).mockResolvedValue({} as never);
      await ingestionApiKeyRepository.update('key-1', { active: false });

      expect(prisma.ingestionApiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: { active: false },
        select: expect.objectContaining({ id: true, label: true }),
      });
      const updateArgs = vi.mocked(prisma.ingestionApiKey.update).mock.calls[0][0];
      expect(updateArgs.select).not.toHaveProperty('keyHash');
    });
  });
});
