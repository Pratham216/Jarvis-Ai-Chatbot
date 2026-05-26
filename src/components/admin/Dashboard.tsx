"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface Stats {
  window: { since: string; until: string };
  summary: {
    totalRequests: number;
    errors: number;
    cancelled: number;
    errorRate: number;
    p50Latency: number;
    p95Latency: number;
    p50Ttft: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
  timeseries: { ts: string; requests: number; errors: number; avgLatency: number }[];
  byModel: {
    model: string;
    provider: string;
    count: number;
    errors: number;
    p50: number;
    p95: number;
    tokens: number;
  }[];
  recent: {
    id: string;
    requestId: string;
    model: string;
    provider: string;
    status: string;
    latencyMs: number;
    totalTokens: number | null;
    errorMessage: string | null;
    createdAt: string;
  }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen p-6">
      <header className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Observability</h1>
            <p className="text-xs text-zinc-500">Inference logs · last 24h</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </header>

      {!stats ? (
        <div className="text-center text-sm text-zinc-500 py-20">
          {loading ? "Loading…" : "No data yet — send a chat message first."}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Requests (24h)" value={stats.summary.totalRequests.toLocaleString()} />
            <Stat
              label="Error rate"
              value={`${(stats.summary.errorRate * 100).toFixed(1)}%`}
              tone={stats.summary.errorRate > 0.05 ? "bad" : "good"}
            />
            <Stat label="p50 latency" value={`${stats.summary.p50Latency} ms`} />
            <Stat label="p95 latency" value={`${stats.summary.p95Latency} ms`} />
            <Stat label="p50 TTFT" value={`${stats.summary.p50Ttft} ms`} />
            <Stat label="Total tokens" value={stats.summary.totalTokens.toLocaleString()} />
            <Stat label="Prompt tokens" value={stats.summary.promptTokens.toLocaleString()} />
            <Stat label="Completion tokens" value={stats.summary.completionTokens.toLocaleString()} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Throughput (req/hour)">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.timeseries}>
                  <CartesianGrid strokeOpacity={0.15} vertical={false} />
                  <XAxis dataKey="ts" tickFormatter={fmtHour} fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip labelFormatter={fmtFull} />
                  <Legend />
                  <Bar dataKey="requests" fill="#3b82f6" name="Requests" />
                  <Bar dataKey="errors" fill="#ef4444" name="Errors" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Avg latency (ms)">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={stats.timeseries}>
                  <CartesianGrid strokeOpacity={0.15} vertical={false} />
                  <XAxis dataKey="ts" tickFormatter={fmtHour} fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip labelFormatter={fmtFull} />
                  <Line type="monotone" dataKey="avgLatency" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card title="By model">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500 border-b border-black/10 dark:border-white/10">
                  <tr>
                    <th className="py-2 pr-3">Model</th>
                    <th className="py-2 pr-3">Provider</th>
                    <th className="py-2 pr-3 text-right">Requests</th>
                    <th className="py-2 pr-3 text-right">Errors</th>
                    <th className="py-2 pr-3 text-right">p50</th>
                    <th className="py-2 pr-3 text-right">p95</th>
                    <th className="py-2 pr-3 text-right">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byModel.map((m) => (
                    <tr key={m.model} className="border-b border-black/5 dark:border-white/5">
                      <td className="py-2 pr-3 font-mono text-xs">{m.model}</td>
                      <td className="py-2 pr-3">{m.provider}</td>
                      <td className="py-2 pr-3 text-right">{m.count}</td>
                      <td className="py-2 pr-3 text-right">{m.errors}</td>
                      <td className="py-2 pr-3 text-right">{m.p50}ms</td>
                      <td className="py-2 pr-3 text-right">{m.p95}ms</td>
                      <td className="py-2 pr-3 text-right">{m.tokens.toLocaleString()}</td>
                    </tr>
                  ))}
                  {stats.byModel.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-xs text-zinc-500">
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Recent requests">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500 border-b border-black/10 dark:border-white/10">
                  <tr>
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Model</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 text-right">Latency</th>
                    <th className="py-2 pr-3 text-right">Tokens</th>
                    <th className="py-2 pr-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((r) => (
                    <tr key={r.id} className="border-b border-black/5 dark:border-white/5">
                      <td className="py-1.5 pr-3 text-xs text-zinc-500">
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-xs">{r.model}</td>
                      <td className="py-1.5 pr-3">
                        <span
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            r.status === "success" &&
                              "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
                            r.status === "error" &&
                              "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                            r.status === "cancelled" &&
                              "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                          )}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-right">{r.latencyMs}ms</td>
                      <td className="py-1.5 pr-3 text-right">{r.totalTokens ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-xs text-red-500 truncate max-w-xs">
                        {r.errorMessage ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div
        className={cn(
          "text-xl font-semibold mt-1",
          tone === "bad" && "text-red-500",
          tone === "good" && "text-green-600 dark:text-green-400",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
      <h2 className="text-sm font-medium mb-3">{title}</h2>
      {children}
    </div>
  );
}

function fmtHour(ts: string) {
  const d = new Date(ts);
  return `${d.getHours()}:00`;
}
function fmtFull(ts: string) {
  return new Date(ts).toLocaleString();
}
