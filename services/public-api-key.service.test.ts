import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publicApiKeyService } from './public-api-key.service';
import { publicApiKeyRepository } from '@/repositories/public-api-key.repository';
import { NotFoundError } from '@/lib/errors';

vi.mock('@/repositories/public-api-key.repository', () => ({
  publicApiKeyRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

describe('PublicApiKeyService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('update', () => {
    it('throws NotFoundError for an unknown key', async () => {
      vi.mocked(publicApiKeyRepository.findById).mockResolvedValue(null);
      await expect(publicApiKeyService.update('missing', { active: false })).rejects.toThrow(
        NotFoundError
      );
      expect(publicApiKeyRepository.update).not.toHaveBeenCalled();
    });

    it('deactivates an existing key', async () => {
      vi.mocked(publicApiKeyRepository.findById).mockResolvedValue({
        id: 'key-1',
        label: 'Marketing site',
        active: true,
        createdAt: new Date(),
      } as never);
      vi.mocked(publicApiKeyRepository.update).mockResolvedValue({} as never);

      await publicApiKeyService.update('key-1', { active: false });

      expect(publicApiKeyRepository.update).toHaveBeenCalledWith('key-1', { active: false });
    });
  });
});
