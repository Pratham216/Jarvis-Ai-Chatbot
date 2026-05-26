import { NextRequest, NextResponse } from "next/server";
import { InferenceLogEventSchema } from "@/lib/ingest-schema";
import { getIngestQueue } from "@/lib/queue";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-ingest-secret");
  const expected = process.env.INGEST_SECRET ?? "dev-secret-change-me";
  if (secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
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

  try {
    const queue = getIngestQueue();
    await queue.add("log", parsed.data, { jobId: parsed.data.requestId });
  } catch (err) {
    console.error("[ingest] queue push failed", err);
    return NextResponse.json({ error: "queue unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, requestId: parsed.data.requestId }, { status: 202 });
}
