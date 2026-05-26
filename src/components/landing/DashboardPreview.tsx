"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { SectionHeader } from "./Features";
import { BarChart3, TrendingUp } from "lucide-react";

export default function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [22, 0, -10]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1, 0.96]);

  return (
    <section id="dashboard" ref={ref} className="relative py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Observability"
          title="Numbers you can act on."
          subtitle="p50/p95 latency, throughput, error rate, per-model breakdown. Auto-refresh every 15s."
        />

        <motion.div
          style={{ rotateX, scale, transformPerspective: 1500 }}
          className="mt-12"
        >
          <div className="rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_50px_150px_-30px_rgba(255,255,255,0.18)] overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-white/15" />
                <div className="size-2.5 rounded-full bg-white/15" />
                <div className="size-2.5 rounded-full bg-white/15" />
              </div>
              <div className="ml-3 text-[10px] text-white/40 font-mono">localhost:3000/admin</div>
            </div>

            {/* Stat tiles */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-white/10">
              <Stat label="Requests · 24h" value="1,284" trend="+12%" />
              <Stat label="Error rate" value="0.4%" trend="−0.2%" good />
              <Stat label="p50 latency" value="412 ms" />
              <Stat label="p95 latency" value="1.8 s" />
            </div>

            {/* Chart */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs text-white/60 uppercase tracking-wide">
                    Throughput
                  </h4>
                  <TrendingUp className="size-3.5 text-emerald-400" />
                </div>
                <FakeBarChart />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs text-white/60 uppercase tracking-wide">
                    By model
                  </h4>
                  <BarChart3 className="size-3.5 text-white/60" />
                </div>
                <div className="space-y-2.5">
                  <ModelRow name="gemini-2.5-flash" pct={62} />
                  <ModelRow name="gpt-4o-mini" pct={24} />
                  <ModelRow name="claude-sonnet-4" pct={14} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  trend,
  good,
}: {
  label: string;
  value: string;
  trend?: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[10px] text-white/50 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-white mt-1.5">{value}</div>
      {trend && (
        <div
          className={`text-[10px] mt-0.5 ${
            good ? "text-emerald-400" : "text-white/50"
          }`}
        >
          {trend}
        </div>
      )}
    </div>
  );
}

function FakeBarChart() {
  const bars = [22, 35, 28, 48, 40, 56, 52, 64, 58, 72, 68, 80, 76, 70];
  return (
    <div className="h-32 flex items-end gap-1.5">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.025, ease: "easeOut" }}
          className="flex-1 rounded-t bg-gradient-to-t from-white/40 to-white/80"
        />
      ))}
    </div>
  );
}

function ModelRow({ name, pct }: { name: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-white/70 font-mono truncate">{name}</span>
        <span className="text-white/40">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-white rounded-full"
        />
      </div>
    </div>
  );
}
