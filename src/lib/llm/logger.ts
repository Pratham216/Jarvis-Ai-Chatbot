import type { InferenceLogEvent } from "./types";

export interface LogSink {
  emit(event: InferenceLogEvent): void;
}

/**
 * Fire-and-forget HTTP log sink. Posts events to /api/ingest without
 * blocking the chat path. Failures are swallowed and written to console
 * so a logging outage never breaks the user-facing request.
 */
export class HttpLogSink implements LogSink {
  constructor(
    private readonly baseUrl: string,
    private readonly secret: string,
  ) {}

  emit(event: InferenceLogEvent): void {
    const url = `${this.baseUrl.replace(/\/$/, "")}/api/ingest`;
    void fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-secret": this.secret,
      },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch((err) => {
      console.error("[log-sink] failed to emit", err);
    });
  }
}

export class NullLogSink implements LogSink {
  emit(): void {
    // no-op for tests
  }
}
