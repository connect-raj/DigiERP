import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestionApiKeyService } from './ingestion-api-key.service';
import { ingestionApiKeyRepository } from '@/repositories/ingestion-api-key.repository';
import { NotFoundError } from '@/lib/errors';

vi.mock('@/repositories/ingestion-api-key.repository', () => ({
  ingestionApiKeyRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

describe('IngestionApiKeyService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('update', () => {
    it('throws NotFoundError for an unknown key', async () => {
      vi.mocked(ingestionApiKeyRepository.findById).mockResolvedValue(null);
      await expect(ingestionApiKeyService.update('missing', { active: false })).rejects.toThrow(
        NotFoundError
      );
      expect(ingestionApiKeyRepository.update).not.toHaveBeenCalled();
    });

    it('deactivates an existing key', async () => {
      vi.mocked(ingestionApiKeyRepository.findById).mockResolvedValue({
        id: 'key-1',
        label: 'Expo microsite',
        source: 'EXPO',
        keyHash: 'hash',
        active: true,
        createdAt: new Date(),
      } as never);
      vi.mocked(ingestionApiKeyRepository.update).mockResolvedValue({} as never);

      await ingestionApiKeyService.update('key-1', { active: false });

      expect(ingestionApiKeyRepository.update).toHaveBeenCalledWith('key-1', { active: false });
    });
  });
});
