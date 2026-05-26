import { getQStashClient } from "@/lib/qstash";
import type { InferenceLogEvent } from "./types";

export interface LogSink {
  emit(event: InferenceLogEvent): void;
}

/**
 * Fire-and-forget log sink.
 *
 * Production (Vercel): publishes the event to QStash, which guarantees
 * delivery (with retries) to /api/ingest. Chat route never blocks.
 *
 * Local dev (no QSTASH_TOKEN): falls back to a direct signed POST to
 * /api/ingest so you don't need QStash running locally.
 *
 * Failures are swallowed — a logging outage never breaks a chat reply.
 */
export class HttpLogSink implements LogSink {
  constructor(
    private readonly baseUrl: string,
    private readonly secret: string,
  ) {}

  emit(event: InferenceLogEvent): void {
    const qstash = getQStashClient();
    const ingestUrl = `${this.baseUrl.replace(/\/$/, "")}/api/ingest`;

    if (qstash) {
      // Production path: hand off to QStash, return immediately.
      void qstash
        .publishJSON({
          url: ingestUrl,
          body: event,
          retries: 3,
          deduplicationId: event.requestId,
        })
        .catch((err) => console.error("[log-sink] qstash publish failed", err));
      return;
    }

    // Dev fallback: direct POST with shared secret.
    void fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-secret": this.secret,
      },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch((err) => console.error("[log-sink] direct post failed", err));
  }
}

export class NullLogSink implements LogSink {
  emit(): void {
    // no-op for tests
  }
}
