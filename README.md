# Jarvis AI — Inference Logging

A lightweight LLM chatbot with a built-in observability pipeline. Every model call is wrapped by an SDK, streamed end-to-end, and asynchronously logged through a queue to Postgres — without blocking the chat path.

Built for the take-home: multi-provider via OpenRouter, streaming SSE, PII redaction, conversation management (list/resume/cancel), latency/throughput/error dashboard, one-command Docker Compose setup.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend / API | Next.js 16 (App Router) + Tailwind v4 |
| LLM Gateway | OpenRouter (Claude, GPT, Gemini, DeepSeek, Grok, …) |
| Wrapper SDK | Custom TypeScript `LLMClient` + `OpenRouterAdapter` |
| Queue | Redis + BullMQ |
| Database | Postgres 16 + Prisma 7 |
| Charts | Recharts |
| Infra | Docker Compose |

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  Next.js UI │───▶│  /api/chat   │───▶│  LLMClient   │──▶ OpenRouter (SSE)
│  (React)    │    │  (SSE proxy) │    │  +Adapter    │
└─────────────┘    └──────┬───────┘    └──────┬───────┘
                          │                   │ fire-and-forget log event
                          │                   ▼
                          │           ┌──────────────┐
                          │           │ /api/ingest  │ (Zod validate)
                          │           └──────┬───────┘
                          │                  ▼
                          │           ┌──────────────┐    ┌──────────────┐
                          │           │ Redis Queue  │───▶│ BullMQ worker│
                          │           │   (BullMQ)   │    │  PII redact  │
                          │           └──────────────┘    └──────┬───────┘
                          ▼                                       ▼
                  ┌─────────────────────────────────────────────────┐
                  │                    Postgres                     │
                  │   conversations · messages · inference_logs     │
                  └─────────────────────────────────────────────────┘
```

## Quick start — one-command setup

Requirements: Docker Desktop running, an [OpenRouter API key](https://openrouter.ai/keys).

```bash
# 1. Configure env
cp .env.example .env
# Edit .env and paste OPENROUTER_API_KEY=sk-or-...

# 2. Bring up everything (Postgres, Redis, app, worker)
docker compose --profile full up -d

# 3. Run migrations into the dockerized DB
docker compose exec app npx prisma migrate deploy

# 4. Open
# http://localhost:3000      → chat UI
# http://localhost:3000/admin → dashboard
```

## Quick start — dev mode (recommended while iterating)

```bash
# 1. Configure env
cp .env.example .env
# paste your OPENROUTER_API_KEY

# 2. Start DB + Redis only
npm run docker:up

# 3. Run migrations + generate Prisma client
npm run db:migrate

# 4. Run app and worker (two terminals)
npm run dev          # terminal 1
npm run worker:dev   # terminal 2
```

UI: http://localhost:3000 · Dashboard: http://localhost:3000/admin · Prisma Studio: `npm run db:studio`

## Features

- **Multi-provider** — Model picker in the UI; OpenRouter routes to Claude / GPT / Gemini / DeepSeek / Grok with one key. Adding a native provider = one new `LLMAdapter` impl.
- **Streaming** — SSE end-to-end. UI gets tokens as they arrive; cancel button aborts the upstream call and marks the log row as `cancelled`.
- **Conversation management** — Sidebar to list, resume, and delete. Cancel button on in-flight streams.
- **PII redaction** — Worker runs regex-based redaction (email, phone, SSN, credit-card-ish, IPv4, API-key-ish) on log previews before writing to Postgres. Hit counts kept in `metadata.redactionHits`.
- **Observability dashboard** — `/admin` shows p50/p95 latency, TTFT, throughput, error rate, token usage, and per-model breakdown. Auto-refreshes every 15s.
- **Async ingestion** — Chat path never awaits the log write. `fetch(...).catch(...)` to `/api/ingest`, which validates with Zod and pushes to BullMQ. Worker drains and writes.

## Schema design

Three tables. Separation is deliberate:

| Table | Purpose |
| --- | --- |
| `conversations` | User-visible thread metadata (title, status, timestamps). |
| `messages` | The chat transcript. Optimized for chronological reads. |
| `inference_logs` | Per-call observability rows. Sliced by time / model / status. |

Why separate `messages` and `inference_logs`?
- Chat reads only need messages; loading a conversation never scans observability data.
- Logs can be aggressively pruned, exported, or archived without touching chat history.
- A single message may have multiple log rows over time (retries, regenerations) → 1:N is natural.

Indexes:
- `inference_logs(conversation_id, created_at)` for per-conversation drilldowns.
- `inference_logs(provider, model, created_at)` for per-model dashboards.
- `inference_logs(status, created_at)` for error queries.
- `inference_logs.request_id` unique → idempotent upserts from the worker.

Previews only (first 500 chars of input/output) — keeps row size bounded and limits PII surface area. Toggleable in `client.ts`.

## Tradeoffs

- **Async logging via queue** — Win on latency (chat path is unblocked); cost is at-least-once delivery. Mitigated by `requestId`-keyed upserts in the worker.
- **Postgres over a TSDB (ClickHouse/Timescale)** — Simpler for this scale. For >10M logs/day or sub-second dashboard queries, ClickHouse would be the next step.
- **Hourly buckets computed in app code** — Simple, works to ~100k rows/24h. Real prod would use Postgres `time_bucket()` or pre-aggregated rollups.
- **PII redaction at ingest, not at SDK** — Keeps the SDK thin. Raw PII transits the network briefly; mitigated by same-host deployment and the `x-ingest-secret` header.
- **Storing redacted text only** — Originals are never written to disk. Reversible would be safer for replay but worse for compliance.
- **One conversational context window (last 20 turns)** — Naive truncation. Real systems would summarize older turns; out of scope here.

## What I'd improve with more time

- **Streaming logs** — Emit a `start` event when the request begins, then a `finish` event. Today we only log on completion, so partial-failure visibility is limited.
- **Full content storage** — Move to `messages` for full content + separate `content_blob_url` for >N-char payloads in object storage.
- **Better cancel signal propagation** — Currently the abort fires on the upstream fetch, but if OpenRouter has buffered tokens we may still count them.
- **Auth** — No user model yet. `user_id` is in the schema but unset; add NextAuth.
- **Tests** — Unit tests for the redactor and adapter, integration test that drives a fake provider through the full pipe.
- **Dead-letter handling** — BullMQ retries 5x then drops. Wire a DLQ table.
- **Sampling for high-traffic** — At scale, log 100% of errors + sample success at e.g. 10%.
- **Tracing** — OTel spans on the chat path; today only the final log event is emitted.
- **K8s deployment** — Manifests for Postgres (statefulset), Redis (statefulset), app/worker (deployment) + ingress. Skipped for the deliverable.

## File layout

```
src/
  app/
    api/
      chat/route.ts              # SSE chat endpoint
      ingest/route.ts            # Log ingestion endpoint
      conversations/             # CRUD for sidebar
      admin/stats/route.ts       # Aggregated dashboard data
    admin/page.tsx               # Dashboard route
    page.tsx                     # Chat UI route
  components/
    chat/                        # Sidebar + ChatPane + ChatApp
    admin/Dashboard.tsx          # Recharts dashboard
  lib/
    llm/
      types.ts                   # ChatRequest, StreamChunk, LogEvent, …
      openrouter.ts              # OpenRouter SSE adapter
      client.ts                  # Instrumented LLMClient
      logger.ts                  # Fire-and-forget HTTP sink
      index.ts                   # Factory + model list
    db.ts                        # Prisma singleton
    queue.ts                     # BullMQ queue/redis singletons
    redact.ts                    # PII redactor
    ingest-schema.ts             # Zod schema for log events
    utils.ts                     # cn(), date helpers
  worker/
    index.ts                     # BullMQ worker process
prisma/
  schema.prisma                  # conversations, messages, inference_logs
docker-compose.yml               # Postgres + Redis (+ app/worker under "full" profile)
Dockerfile                       # Next.js standalone build
Dockerfile.worker                # Worker process
```

## Demo flow

1. Open http://localhost:3000.
2. Pick a model from the dropdown.
3. Type a message → watch tokens stream.
4. Click **Cancel** mid-stream → log row marked `cancelled`.
5. Open `/admin` → see the request show up within seconds with latency, TTFT, tokens, and status.
6. Send a message containing an email or phone → check the `output_preview` column in `inference_logs`; it'll be redacted.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for ingestion flow, logging strategy, scaling considerations, and failure handling.
