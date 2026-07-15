import { settingsRepository } from '@/repositories/settings.repository';
import { UpdateSettingsInput } from '@/validations/settings';

export class SettingsService {
  /** Returns the singleton settings row, or null if not yet configured. */
  async get() {
    return settingsRepository.find();
  }

  async update(data: UpdateSettingsInput) {
    return settingsRepository.upsert(data);
  }
}

export const settingsService = new SettingsService();
