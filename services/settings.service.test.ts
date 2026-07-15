import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsService } from './settings.service';
import { settingsRepository } from '@/repositories/settings.repository';

vi.mock('@/repositories/settings.repository', () => ({
  settingsRepository: {
    find: vi.fn(),
    upsert: vi.fn(),
  },
}));

const mockSettings = {
  id: 1,
  companyName: 'DigiInk Distributors',
  companyAddress: '12 Industrial Estate',
  companyState: 'Gujarat',
  companyGstin: '24ABCDE1234F1Z5',
  companyPan: 'ABCDE1234F',
  financialYearStart: 4,
};

describe('SettingsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('should return the singleton settings row', async () => {
      vi.spyOn(settingsRepository, 'find').mockResolvedValue(mockSettings as never);
      const result = await settingsService.get();
      expect(result).toEqual(mockSettings);
    });

    it('should return null when settings are not configured', async () => {
      vi.spyOn(settingsRepository, 'find').mockResolvedValue(null);
      const result = await settingsService.get();
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should upsert and return the settings row', async () => {
      const input = {
        companyName: 'DigiInk Distributors',
        companyAddress: '12 Industrial Estate',
        companyState: 'Maharashtra',
        companyGstin: '27ABCDE1234F1Z5',
        companyPan: null,
        financialYearStart: 4,
      };
      vi.spyOn(settingsRepository, 'upsert').mockResolvedValue({
        ...mockSettings,
        ...input,
      } as never);
      const result = await settingsService.update(input);
      expect(settingsRepository.upsert).toHaveBeenCalledWith(input);
      expect(result.companyState).toBe('Maharashtra');
    });
  });
});
