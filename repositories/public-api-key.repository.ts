import prisma from '@/lib/prisma';
import { CreatePublicApiKeyInput, UpdatePublicApiKeyInput } from '@/validations/public-api-key';
import { hashApiKey, generateRawApiKey } from '@/lib/api-key';

/** keyHash is a credential-derived value — never select it back out for
 * admin-facing reads/writes. Only lib/api-key.ts's own lookup-by-hash query
 * needs it, and that goes straight to prisma, bypassing this repository. */
const SAFE_SELECT = {
  id: true,
  label: true,
  active: true,
  createdAt: true,
} as const;

export class PublicApiKeyRepository {
  async findAll() {
    return prisma.publicApiKey.findMany({ orderBy: { createdAt: 'desc' }, select: SAFE_SELECT });
  }

  async findById(id: string) {
    return prisma.publicApiKey.findUnique({ where: { id }, select: SAFE_SELECT });
  }

  /** Generates a new raw key, stores only its hash, and returns the raw key
   * once — it is never persisted or retrievable again after this call. */
  async create(data: CreatePublicApiKeyInput) {
    const rawKey = generateRawApiKey();
    const apiKey = await prisma.publicApiKey.create({
      data: {
        label: data.label,
        keyHash: hashApiKey(rawKey),
      },
      select: SAFE_SELECT,
    });
    return { apiKey, rawKey };
  }

  async update(id: string, data: UpdatePublicApiKeyInput) {
    return prisma.publicApiKey.update({ where: { id }, data, select: SAFE_SELECT });
  }
}

export const publicApiKeyRepository = new PublicApiKeyRepository();
