import { NextRequest, NextResponse } from "next/server";
import { InferenceLogEventSchema } from "@/lib/ingest-schema";
import { getQStashReceiver } from "@/lib/qstash";
import { prisma } from "@/lib/db";
import { redact } from "@/lib/redact";

export const runtime = "nodejs";

/**
 * Ingest endpoint. Accepts log events from two sources:
 *
 *   1. QStash callback (production) — verified via Upstash signature.
 *   2. Direct SDK post (local dev)   — verified via x-ingest-secret.
 *
 * Processing is inline: validate → redact PII → upsert by requestId.
 * No queue; QStash already provides retries + durability for prod.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const authorized = await isAuthorized(req, rawBody);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = InferenceLogEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const ev = parsed.data;
  const inputRedacted = redact(ev.inputPreview);
  const outputRedacted = redact(ev.outputPreview);
  const redactionHits = { input: inputRedacted.hits, output: outputRedacted.hits };

  try {
    await prisma.inferenceLog.upsert({
      where: { requestId: ev.requestId },
      create: {
        requestId: ev.requestId,
        conversationId: ev.conversationId,
        messageId: ev.messageId,
        provider: ev.provider,
        model: ev.model,
        status: ev.status,
        latencyMs: ev.latencyMs,
        ttftMs: ev.ttftMs,
        promptTokens: ev.promptTokens,
        completionTokens: ev.completionTokens,
        totalTokens: ev.totalTokens,
        inputPreview: inputRedacted.text || null,
        outputPreview: outputRedacted.text || null,
        errorMessage: ev.errorMessage,
        metadata: { ...(ev.metadata ?? {}), redactionHits },
        startedAt: new Date(ev.startedAt),
        finishedAt: new Date(ev.finishedAt),
      },
      update: {
        status: ev.status,
        latencyMs: ev.latencyMs,
        ttftMs: ev.ttftMs,
        promptTokens: ev.promptTokens,
        completionTokens: ev.completionTokens,
        totalTokens: ev.totalTokens,
        outputPreview: outputRedacted.text || null,
        errorMessage: ev.errorMessage,
        finishedAt: new Date(ev.finishedAt),
      },
    });
  } catch (err) {
    console.error("[ingest] db write failed", err);
    // Returning 500 lets QStash retry (it retries on 5xx, not 2xx/4xx).
    return NextResponse.json({ error: "db unavailable" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, requestId: ev.requestId }, { status: 202 });
}

async function isAuthorized(req: NextRequest, rawBody: string): Promise<boolean> {
  // QStash signed request (production)
  const sig = req.headers.get("upstash-signature");
  if (sig) {
    const receiver = getQStashReceiver();
    if (!receiver) {
      console.error("[ingest] qstash signature present but signing keys not configured");
      return false;
    }
    try {
      return await receiver.verify({ signature: sig, body: rawBody });
    } catch (err) {
      console.error("[ingest] qstash signature verification failed", err);
      return false;
    }
  }

  // Direct SDK post (local dev)
  const secret = req.headers.get("x-ingest-secret");
  const expected = process.env.INGEST_SECRET ?? "dev-secret-change-me";
  return secret === expected;
}
