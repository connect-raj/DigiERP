import prisma from '@/lib/prisma';
import { UpdateSettingsInput } from '@/validations/settings';

export class SettingsRepository {
  /** Settings is a singleton row. */
  async find() {
    return prisma.settings.findFirst();
  }

  async upsert(data: UpdateSettingsInput) {
    const existing = await prisma.settings.findFirst();
    if (existing) {
      return prisma.settings.update({ where: { id: existing.id }, data });
    }
    return prisma.settings.create({ data });
  }
}

export const settingsRepository = new SettingsRepository();
