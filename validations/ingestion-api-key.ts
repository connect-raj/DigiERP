import { z } from 'zod';

export const createIngestionApiKeySchema = z.object({
  label: z.string().min(1, 'Label is required'),
  source: z.enum(['WEBSITE', 'EXPO', 'INDIAMART', 'TRADEINDIA', 'MANUAL']),
});

export const updateIngestionApiKeySchema = z.object({
  active: z.boolean(),
});

export type CreateIngestionApiKeyInput = z.infer<typeof createIngestionApiKeySchema>;
export type UpdateIngestionApiKeyInput = z.infer<typeof updateIngestionApiKeySchema>;
