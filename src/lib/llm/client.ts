import type {
  ChatRequest,
  InferenceLogEvent,
  InferenceStatus,
  LLMAdapter,
  LogContext,
  StreamChunk,
} from "./types";
import type { LogSink } from "./logger";
import { parseProviderFromModel } from "./openrouter";

const PREVIEW_CHARS = 500;

function previewInput(req: ChatRequest): string {
  return req.messages
    .map((m) => `[${m.role}] ${m.content}`)
    .join("\n")
    .slice(0, PREVIEW_CHARS);
}

/**
 * Wraps an LLMAdapter with instrumentation. Captures latency, TTFT,
 * token usage, status, and emits a single InferenceLogEvent per call
 * via the configured LogSink — regardless of success, error, or cancel.
 */
export class LLMClient {
  constructor(
    private readonly adapter: LLMAdapter,
    private readonly sink: LogSink,
  ) {}

  async *stream(
    req: ChatRequest,
    ctx: LogContext,
    signal?: AbortSignal,
  ): AsyncIterable<StreamChunk> {
    const startedAt = Date.now();
    let firstChunkAt: number | null = null;
    let outputText = "";
    let usage: StreamChunk["usage"] | undefined;
    let finishReason: string | undefined;
    let status: InferenceStatus = "success";
    let errorMessage: string | undefined;

    try {
      for await (const chunk of this.adapter.stream(req, signal)) {
        if (firstChunkAt === null && chunk.delta) firstChunkAt = Date.now();
        if (chunk.delta) outputText += chunk.delta;
        if (chunk.usage) usage = chunk.usage;
        if (chunk.finishReason) finishReason = chunk.finishReason;
        yield chunk;
      }
    } catch (err) {
      if (signal?.aborted) {
        status = "cancelled";
        errorMessage = "client cancelled";
      } else {
        status = "error";
        errorMessage = err instanceof Error ? err.message : String(err);
      }
      throw err;
    } finally {
      const finishedAt = Date.now();
      const event: InferenceLogEvent = {
        requestId: ctx.requestId,
        conversationId: ctx.conversationId,
        messageId: ctx.messageId,
        provider: parseProviderFromModel(req.model),
        model: req.model,
        status,
        latencyMs: finishedAt - startedAt,
        ttftMs: firstChunkAt ? firstChunkAt - startedAt : undefined,
        promptTokens: usage?.promptTokens,
        completionTokens: usage?.completionTokens,
        totalTokens: usage?.totalTokens,
        inputPreview: previewInput(req),
        outputPreview: outputText.slice(0, PREVIEW_CHARS),
        errorMessage,
        metadata: {
          adapter: this.adapter.name,
          temperature: req.temperature,
          maxTokens: req.maxTokens,
          finishReason,
          messageCount: req.messages.length,
        },
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
      };
      this.sink.emit(event);
    }
  }
}
