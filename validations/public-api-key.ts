import { z } from 'zod';

export const createPublicApiKeySchema = z.object({
  label: z.string().min(1, 'Label is required'),
});

export const updatePublicApiKeySchema = z.object({
  active: z.boolean(),
});

export type CreatePublicApiKeyInput = z.infer<typeof createPublicApiKeySchema>;
export type UpdatePublicApiKeyInput = z.infer<typeof updatePublicApiKeySchema>;
