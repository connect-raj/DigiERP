import prisma from '@/lib/prisma';
import {
  CreateIngestionApiKeyInput,
  UpdateIngestionApiKeyInput,
} from '@/validations/ingestion-api-key';
import { hashApiKey, generateRawApiKey } from '@/lib/api-key';

/** keyHash is a credential-derived value — never select it back out for
 * admin-facing reads/writes. Only lib/api-key.ts's own lookup-by-hash query
 * needs it, and that goes straight to prisma, bypassing this repository. */
const SAFE_SELECT = {
  id: true,
  label: true,
  source: true,
  active: true,
  createdAt: true,
} as const;

export class IngestionApiKeyRepository {
  async findAll() {
    return prisma.ingestionApiKey.findMany({ orderBy: { createdAt: 'desc' }, select: SAFE_SELECT });
  }

  async findById(id: string) {
    return prisma.ingestionApiKey.findUnique({ where: { id }, select: SAFE_SELECT });
  }

  /** Generates a new raw key, stores only its hash, and returns the raw key
   * once — it is never persisted or retrievable again after this call. */
  async create(data: CreateIngestionApiKeyInput) {
    const rawKey = generateRawApiKey();
    const apiKey = await prisma.ingestionApiKey.create({
      data: {
        label: data.label,
        source: data.source,
        keyHash: hashApiKey(rawKey),
      },
      select: SAFE_SELECT,
    });
    return { apiKey, rawKey };
  }

  async update(id: string, data: UpdateIngestionApiKeyInput) {
    return prisma.ingestionApiKey.update({ where: { id }, data, select: SAFE_SELECT });
  }
}

export const ingestionApiKeyRepository = new IngestionApiKeyRepository();
