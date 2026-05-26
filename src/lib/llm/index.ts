import { LLMClient } from "./client";
import { HttpLogSink } from "./logger";
import { OpenRouterAdapter } from "./openrouter";

export * from "./types";
export { LLMClient } from "./client";
export { OpenRouterAdapter, parseProviderFromModel } from "./openrouter";
export { HttpLogSink, NullLogSink } from "./logger";

let _client: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (_client) return _client;

  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  const ingestBaseUrl = process.env.INGEST_BASE_URL ?? "http://localhost:3000";
  const ingestSecret = process.env.INGEST_SECRET ?? "dev-secret-change-me";

  const adapter = new OpenRouterAdapter(apiKey);
  const sink = new HttpLogSink(ingestBaseUrl, ingestSecret);
  _client = new LLMClient(adapter, sink);
  return _client;
}

export const SUPPORTED_MODELS = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google", free: false, supportsImages: true },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI", free: false, supportsImages: true },
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", provider: "Anthropic", free: false, supportsImages: true },
];
