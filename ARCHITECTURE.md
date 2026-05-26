# Jarvis AI — Architecture Notes

## Ingestion flow

1. User sends a chat message → `POST /api/chat`.
2. The chat route persists the user message, builds the windowed context, and asks `LLMClient.stream()` for an async iterator of chunks.
3. `LLMClient` wraps `OpenRouterAdapter.stream()`. It starts a timer, forwards each chunk to the response, and tracks:
   - First-chunk timestamp → TTFT (time to first token)
   - Accumulated output text → preview
   - Usage (from the final OpenRouter chunk, requested via `stream_options.include_usage`)
   - Status (`success`, `cancelled` if `signal.aborted`, `error` otherwise)
4. The chat route encodes each chunk as an SSE event (`event: delta` / `event: usage` / `event: done`) and writes it to the response stream.
5. After the iterator finishes (success, error, or cancel), `LLMClient`'s `finally` block builds a single `InferenceLogEvent` and calls `sink.emit(event)`. The HTTP sink fires a non-awaited POST to `/api/ingest`.
6. `/api/ingest` validates with Zod, then pushes the payload to the BullMQ queue using `requestId` as the `jobId` (deduplicates retries).
7. The worker process pulls jobs, runs PII redaction on the previews, and upserts into `inference_logs` keyed by `request_id`.
8. The chat route, after the stream is fully consumed, persists the assistant message in `messages` and patches the log row's `message_id` (if it already exists).

## Logging strategy

- **Single log event per inference call.** Emitted in a `finally` block, so success, error, and cancel all produce exactly one row.
- **Fire-and-forget, never blocking.** The HTTP sink uses `fetch(...).catch(console.error)` with `keepalive: true`. If `/api/ingest` is down, the chat completes normally; the log is lost (acceptable tradeoff — we'd rather lose a log than fail a chat).
- **Idempotent.** `requestId` is unique. The worker `upsert`s, so retries are safe.
- **Preview-only.** Input is the joined chat window truncated to 500 chars. Output is the streamed text truncated to 500 chars. Keeps row size bounded and limits the PII blast radius.
- **Status semantics:**
  - `success` — stream finished cleanly.
  - `error` — adapter threw (non-abort).
  - `cancelled` — `AbortSignal` fired (client closed the connection or hit Cancel).
- **Token counts** — captured from OpenRouter's final usage chunk; absent if the upstream model didn't return usage.
- **TTFT** — measured at the first non-empty `delta` chunk, not at HTTP open. This is the metric that actually correlates to perceived UX.

## Scaling considerations

The bottleneck axis changes at different scales:

| Scale | Bottleneck | Mitigation |
| --- | --- | --- |
| <100 req/day | None | Single-node dev setup is fine. |
| ~1000/day | Worker contention | Bump `concurrency` in `worker/index.ts`; already supports 10. |
| ~100k/day | Dashboard query latency | Add pre-aggregated rollup tables; switch hourly buckets to `time_bucket()`. |
| >1M/day | Postgres write throughput | Move `inference_logs` to ClickHouse / Timescale; keep `messages` in Postgres. |
| >10M/day | Single-region | Shard by `conversation_id`; replicate logs to S3/Parquet for analytics. |

Other levers:
- **Ingest endpoint** is stateless → horizontal scale behind a load balancer.
- **Workers** are stateless and idempotent → run as many as you want; BullMQ handles distribution.
- **Sampling** — At high scale, log 100% of `error` + `cancelled`, sample `success` at 10%.
- **Backpressure** — If the queue depth grows beyond a threshold, the ingest endpoint can return 503; the SDK already swallows ingest errors so chat keeps working.

## Failure handling assumptions

| Failure | Behavior |
| --- | --- |
| OpenRouter timeout / 5xx | Adapter throws; chat route returns 500 to the UI; log row written with `status='error'`. |
| OpenRouter mid-stream disconnect | Iterator throws; partial output preserved in the log row + assistant message. |
| User clicks Cancel | `AbortController.abort()` → adapter cancels its `fetch` → log row written with `status='cancelled'` and partial output. |
| Redis down | `/api/ingest` returns 503. The SDK swallows the error → chat still works; the log is lost. With more time: write to a local file fallback and replay on reconnect. |
| Postgres down | Worker job fails → BullMQ retries with exponential backoff (5 attempts). Chat path is unaffected (it talks to Postgres directly and will fail there independently). |
| Worker crashes mid-job | BullMQ requeues; `upsert` on `requestId` makes retries idempotent. |
| Duplicate ingest POST | Queue uses `requestId` as `jobId` → deduplicated at queue level; `upsert` is the second line of defense. |
| Schema mismatch (old SDK, new server) | Zod validation rejects with 422; worker drops malformed jobs with a warning. |

## What's intentionally *not* in scope

- Authentication / multi-tenant isolation (schema supports it via `user_id`, not wired).
- Full content storage (only previews — by design).
- Cost tracking (would multiply tokens by per-model unit cost from a price table).
- OpenTelemetry tracing (would add spans on chat → adapter → upstream HTTP).
- Conversation summarization for long contexts (window is naïvely truncated to 20 turns).
- A dead-letter queue.

These are all called out in the README's "What I'd improve with more time" section.
