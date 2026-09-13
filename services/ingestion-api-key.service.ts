import { ingestionApiKeyRepository } from '@/repositories/ingestion-api-key.repository';
import {
  CreateIngestionApiKeyInput,
  UpdateIngestionApiKeyInput,
} from '@/validations/ingestion-api-key';
import { NotFoundError } from '@/lib/errors';

export class IngestionApiKeyService {
  async getAll() {
    return ingestionApiKeyRepository.findAll();
  }

  async create(data: CreateIngestionApiKeyInput) {
    return ingestionApiKeyRepository.create(data);
  }

  async update(id: string, data: UpdateIngestionApiKeyInput) {
    const apiKey = await ingestionApiKeyRepository.findById(id);
    if (!apiKey) {
      throw new NotFoundError(`Ingestion API key with id '${id}' not found`);
    }
    return ingestionApiKeyRepository.update(id, data);
  }
}

export const ingestionApiKeyService = new IngestionApiKeyService();
