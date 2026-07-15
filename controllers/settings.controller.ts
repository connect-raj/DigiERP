import { NextRequest } from 'next/server';
import { settingsService } from '@/services/settings.service';
import { updateSettingsSchema } from '@/validations/settings';
import { successResponse, BadRequestError } from '@/lib/errors';

export class SettingsController {
  async get() {
    const settings = await settingsService.get();
    return successResponse(settings);
  }

  async update(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = updateSettingsSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const settings = await settingsService.update(validated.data);
    return successResponse(settings);
  }
}

export const settingsController = new SettingsController();
