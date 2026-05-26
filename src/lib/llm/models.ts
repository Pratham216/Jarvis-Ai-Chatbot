import { SUPPORTED_MODELS } from "./index";

interface OpenRouterModel {
  id: string;
  name?: string;
  description?: string;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  architecture?: {
    input_modalities?: string[];
  };
}

export interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  free: boolean;
  supportsImages: boolean;
}

let cache: { at: number; models: ModelInfo[] } | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour

function providerFromId(id: string): string {
  const slash = id.indexOf("/");
  const slug = slash > 0 ? id.slice(0, slash) : id;
  const map: Record<string, string> = {
    "anthropic": "Anthropic",
    "openai": "OpenAI",
    "google": "Google",
    "meta-llama": "Meta",
    "deepseek": "DeepSeek",
    "qwen": "Qwen",
    "x-ai": "xAI",
    "mistralai": "Mistral",
    "nvidia": "NVIDIA",
    "microsoft": "Microsoft",
    "cohere": "Cohere",
    "z-ai": "Zhipu",
  };
  return map[slug] ?? slug;
}

function toModelInfo(m: OpenRouterModel): ModelInfo {
  const free = m.pricing?.prompt === "0" && m.pricing?.completion === "0";
  const supportsImages = m.architecture?.input_modalities?.includes("image") ?? false;
  const baseLabel = m.name ?? m.id.split("/").pop() ?? m.id;
  const label = baseLabel.replace(/\s*\(free\)\s*$/i, "");
  return {
    id: m.id,
    label,
    provider: providerFromId(m.id),
    free,
    supportsImages,
  };
}

function fallbackModels(): ModelInfo[] {
  return SUPPORTED_MODELS.map((m) => ({
    id: m.id,
    label: m.label,
    provider: m.provider,
    free: !!m.free,
    supportsImages: !!m.supportsImages,
  }));
}

async function fetchAllModels(): Promise<ModelInfo[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const data = (await res.json()) as { data: OpenRouterModel[] };
    return data.data.map(toModelInfo);
  } catch (err) {
    console.error("[models] fetch failed", err);
    return [];
  }
}

/**
 * Curated 5-model lineup. Each slot resolves to the first live model from
 * OpenRouter matching its predicates. If nothing matches (no internet, key
 * misconfig), we fall back to a hardcoded list.
 */
const SLOTS: Array<{
  preferLabel: string;
  match: (m: ModelInfo) => boolean;
}> = [
  {
    preferLabel: "Gemini 2.5 Flash",
    match: (m) => m.id.startsWith("google/gemini-2.5-flash") && !m.id.includes(":free"),
  },
  {
    preferLabel: "GPT-4o Mini",
    match: (m) => m.id === "openai/gpt-4o-mini",
  },
  {
    preferLabel: "Claude Sonnet",
    match: (m) =>
      m.id.startsWith("anthropic/claude-sonnet-") && !m.id.includes(":thinking"),
  },
];

export async function fetchModels(): Promise<ModelInfo[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.models;

  const all = await fetchAllModels();
  if (all.length === 0) return fallbackModels();

  // Sort each candidate group so we pick the most recent / shortest / non-preview.
  const score = (m: ModelInfo) => {
    let s = 0;
    if (m.id.includes("preview")) s += 50;
    if (m.id.includes("experimental") || m.id.includes("exp")) s += 30;
    if (m.id.includes(":thinking")) s += 20;
    // Prefer shorter ids — usually the canonical alias for the latest version.
    s += m.id.length;
    return s;
  };

  const curated: ModelInfo[] = [];
  for (const slot of SLOTS) {
    const candidates = all.filter(slot.match).sort((a, b) => score(a) - score(b));
    if (candidates[0]) curated.push(candidates[0]);
  }

  // If we didn't fill every slot, top up from the fallback list (deduped).
  if (curated.length < SLOTS.length) {
    for (const fb of fallbackModels()) {
      if (curated.find((m) => m.id === fb.id)) continue;
      curated.push(fb);
      if (curated.length >= SLOTS.length) break;
    }
  }

  cache = { at: Date.now(), models: curated };
  return curated;
}
