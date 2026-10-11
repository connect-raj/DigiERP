import { publicApiKeyRepository } from '@/repositories/public-api-key.repository';
import { CreatePublicApiKeyInput, UpdatePublicApiKeyInput } from '@/validations/public-api-key';
import { NotFoundError } from '@/lib/errors';

export class PublicApiKeyService {
  async getAll() {
    return publicApiKeyRepository.findAll();
  }

  async create(data: CreatePublicApiKeyInput) {
    return publicApiKeyRepository.create(data);
  }

  async update(id: string, data: UpdatePublicApiKeyInput) {
    const apiKey = await publicApiKeyRepository.findById(id);
    if (!apiKey) {
      throw new NotFoundError(`Public API key with id '${id}' not found`);
    }
    return publicApiKeyRepository.update(id, data);
  }
}

export const publicApiKeyService = new PublicApiKeyService();
