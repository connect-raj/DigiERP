import { NextRequest } from 'next/server';
import { publicApiKeyService } from '@/services/public-api-key.service';
import { createPublicApiKeySchema, updatePublicApiKeySchema } from '@/validations/public-api-key';
import { successResponse, BadRequestError, ForbiddenError } from '@/lib/errors';
import { authenticate } from '@/controllers/user.controller';

async function parseBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BadRequestError('Invalid JSON body');
  }
}

/** These keys gate the public marketing-site API, so provisioning/revoking
 * them is restricted to admins, not any authenticated user — same rule as
 * ingestion API keys. */
function requireAdmin(req: NextRequest) {
  const currentUser = authenticate(req);
  if (currentUser.role !== 'admin') {
    throw new ForbiddenError('Only administrators can manage public API keys');
  }
}

export class PublicApiKeyController {
  async getAll(req: NextRequest) {
    requireAdmin(req);
    const apiKeys = await publicApiKeyService.getAll();
    return successResponse(apiKeys);
  }

  async create(req: NextRequest) {
    requireAdmin(req);
    const body = await parseBody(req);

    const validated = createPublicApiKeySchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    // The raw key is returned exactly once, here — it is never stored or
    // retrievable again after this response.
    const { apiKey, rawKey } = await publicApiKeyService.create(validated.data);
    return successResponse({ ...apiKey, rawKey }, 201);
  }

  async update(req: NextRequest, id: string) {
    requireAdmin(req);
    const body = await parseBody(req);

    const validated = updatePublicApiKeySchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const apiKey = await publicApiKeyService.update(id, validated.data);
    return successResponse(apiKey);
  }
}

export const publicApiKeyController = new PublicApiKeyController();
