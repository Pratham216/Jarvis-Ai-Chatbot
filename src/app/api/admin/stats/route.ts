import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx];
}

export async function GET() {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const logs = await prisma.inferenceLog.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      requestId: true,
      provider: true,
      model: true,
      status: true,
      latencyMs: true,
      ttftMs: true,
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  const totalRequests = logs.length;
  const errors = logs.filter((l) => l.status === "error").length;
  const cancelled = logs.filter((l) => l.status === "cancelled").length;
  const successes = logs.filter((l) => l.status === "success");

  const latencies = successes.map((l) => l.latencyMs).sort((a, b) => a - b);
  const ttfts = successes
    .map((l) => l.ttftMs)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);

  const totalTokens = logs.reduce((s, l) => s + (l.totalTokens ?? 0), 0);
  const promptTokens = logs.reduce((s, l) => s + (l.promptTokens ?? 0), 0);
  const completionTokens = logs.reduce((s, l) => s + (l.completionTokens ?? 0), 0);

  // 24 hourly buckets
  const buckets: Record<string, { ts: string; count: number; errors: number; latencyTotal: number; latencyCount: number }> = {};
  for (let i = 23; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 60 * 60 * 1000);
    t.setMinutes(0, 0, 0);
    const key = t.toISOString();
    buckets[key] = { ts: key, count: 0, errors: 0, latencyTotal: 0, latencyCount: 0 };
  }
  for (const l of logs) {
    const t = new Date(l.createdAt);
    t.setMinutes(0, 0, 0);
    const key = t.toISOString();
    const b = buckets[key];
    if (!b) continue;
    b.count++;
    if (l.status === "error") b.errors++;
    if (l.status === "success") {
      b.latencyTotal += l.latencyMs;
      b.latencyCount++;
    }
  }
  const timeseries = Object.values(buckets).map((b) => ({
    ts: b.ts,
    requests: b.count,
    errors: b.errors,
    avgLatency: b.latencyCount > 0 ? Math.round(b.latencyTotal / b.latencyCount) : 0,
  }));

  // Per-model breakdown
  const byModelMap = new Map<
    string,
    { model: string; provider: string; count: number; latencies: number[]; tokens: number; errors: number }
  >();
  for (const l of logs) {
    const key = l.model;
    if (!byModelMap.has(key)) {
      byModelMap.set(key, {
        model: l.model,
        provider: l.provider,
        count: 0,
        latencies: [],
        tokens: 0,
        errors: 0,
      });
    }
    const row = byModelMap.get(key)!;
    row.count++;
    if (l.status === "success") row.latencies.push(l.latencyMs);
    if (l.status === "error") row.errors++;
    row.tokens += l.totalTokens ?? 0;
  }
  const byModel = Array.from(byModelMap.values())
    .map((r) => {
      const sorted = r.latencies.sort((a, b) => a - b);
      return {
        model: r.model,
        provider: r.provider,
        count: r.count,
        errors: r.errors,
        p50: percentile(sorted, 0.5),
        p95: percentile(sorted, 0.95),
        tokens: r.tokens,
      };
    })
    .sort((a, b) => b.count - a.count);

  const recent = logs.slice(0, 50).map((l) => ({
    id: l.id,
    requestId: l.requestId,
    model: l.model,
    provider: l.provider,
    status: l.status,
    latencyMs: l.latencyMs,
    totalTokens: l.totalTokens,
    errorMessage: l.errorMessage,
    createdAt: l.createdAt,
  }));

  return NextResponse.json({
    window: { since: since.toISOString(), until: now.toISOString() },
    summary: {
      totalRequests,
      errors,
      cancelled,
      errorRate: totalRequests > 0 ? errors / totalRequests : 0,
      p50Latency: percentile(latencies, 0.5),
      p95Latency: percentile(latencies, 0.95),
      p50Ttft: percentile(ttfts, 0.5),
      totalTokens,
      promptTokens,
      completionTokens,
    },
    timeseries,
    byModel,
    recent,
  });
}
