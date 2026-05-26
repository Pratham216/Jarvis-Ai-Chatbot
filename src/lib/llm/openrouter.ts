import type { ChatRequest, LLMAdapter, StreamChunk } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterDelta {
  content?: string;
}

interface OpenRouterChoice {
  delta?: OpenRouterDelta;
  finish_reason?: string | null;
}

interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface OpenRouterChunk {
  choices?: OpenRouterChoice[];
  usage?: OpenRouterUsage;
}

export class OpenRouterAdapter implements LLMAdapter {
  readonly name = "openrouter";

  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is required");
  }

  async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<StreamChunk> {
    const encodedMessages = req.messages.map((m) => {
      if (m.images && m.images.length > 0) {
        return {
          role: m.role,
          content: [
            { type: "text", text: m.content },
            ...m.images.map((url) => ({
              type: "image_url",
              image_url: { url },
            })),
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Jarvis AI",
      },
      body: JSON.stringify({
        model: req.model,
        messages: encodedMessages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenRouter ${res.status}: ${text || res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line || !line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") return;

          let chunk: OpenRouterChunk;
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue;
          }

          const choice = chunk.choices?.[0];
          const out: StreamChunk = {};
          if (choice?.delta?.content) out.delta = choice.delta.content;
          if (choice?.finish_reason) out.finishReason = choice.finish_reason;
          if (chunk.usage) {
            out.usage = {
              promptTokens: chunk.usage.prompt_tokens ?? 0,
              completionTokens: chunk.usage.completion_tokens ?? 0,
              totalTokens: chunk.usage.total_tokens ?? 0,
            };
          }
          if (out.delta || out.usage || out.finishReason) yield out;
        }
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
    }
  }
}

export function parseProviderFromModel(model: string): string {
  const slash = model.indexOf("/");
  return slash > 0 ? model.slice(0, slash) : "openrouter";
}
