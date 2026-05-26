export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Optional image data URLs (base64). Used for multimodal models. */
  images?: string[];
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamChunk {
  delta?: string;
  usage?: Usage;
  finishReason?: string;
}

export interface LogContext {
  requestId: string;
  conversationId?: string;
  messageId?: string;
}

export type InferenceStatus = "success" | "error" | "cancelled";

export interface InferenceLogEvent {
  requestId: string;
  conversationId?: string;
  messageId?: string;
  provider: string;
  model: string;
  status: InferenceStatus;
  latencyMs: number;
  ttftMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  inputPreview?: string;
  outputPreview?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  startedAt: string;
  finishedAt: string;
}

export interface LLMAdapter {
  readonly name: string;
  stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<StreamChunk>;
}
