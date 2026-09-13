import { NextRequest } from 'next/server';
import { ingestionApiKeyService } from '@/services/ingestion-api-key.service';
import {
  createIngestionApiKeySchema,
  updateIngestionApiKeySchema,
} from '@/validations/ingestion-api-key';
import { successResponse, BadRequestError, ForbiddenError } from '@/lib/errors';
import { authenticate } from '@/controllers/user.controller';

async function parseBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BadRequestError('Invalid JSON body');
  }
}

/** These keys gate a public data-ingestion endpoint, so provisioning/revoking
 * them is restricted to admins, not any authenticated user. */
function requireAdmin(req: NextRequest) {
  const currentUser = authenticate(req);
  if (currentUser.role !== 'admin') {
    throw new ForbiddenError('Only administrators can manage ingestion API keys');
  }
}

export class IngestionApiKeyController {
  async getAll(req: NextRequest) {
    requireAdmin(req);
    const apiKeys = await ingestionApiKeyService.getAll();
    return successResponse(apiKeys);
  }

  async create(req: NextRequest) {
    requireAdmin(req);
    const body = await parseBody(req);

    const validated = createIngestionApiKeySchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    // The raw key is returned exactly once, here — it is never stored or
    // retrievable again after this response.
    const { apiKey, rawKey } = await ingestionApiKeyService.create(validated.data);
    return successResponse({ ...apiKey, rawKey }, 201);
  }

  async update(req: NextRequest, id: string) {
    requireAdmin(req);
    const body = await parseBody(req);

    const validated = updateIngestionApiKeySchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const apiKey = await ingestionApiKeyService.update(id, validated.data);
    return successResponse(apiKey);
  }
}

export const ingestionApiKeyController = new IngestionApiKeyController();
