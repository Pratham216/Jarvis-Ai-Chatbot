import { z } from "zod";

export const InferenceLogEventSchema = z.object({
  requestId: z.string().min(1).max(128),
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(128),
  status: z.enum(["success", "error", "cancelled"]),
  latencyMs: z.number().int().min(0),
  ttftMs: z.number().int().min(0).optional(),
  promptTokens: z.number().int().min(0).optional(),
  completionTokens: z.number().int().min(0).optional(),
  totalTokens: z.number().int().min(0).optional(),
  inputPreview: z.string().max(2000).optional(),
  outputPreview: z.string().max(2000).optional(),
  errorMessage: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  startedAt: z.string(),
  finishedAt: z.string(),
});

export type InferenceLogEventInput = z.infer<typeof InferenceLogEventSchema>;
