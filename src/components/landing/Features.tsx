"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Zap, Eye, ShieldCheck, GitBranch, Layers, Activity } from "lucide-react";

const FEATURES = [
  {
    icon: Zap,
    title: "Streaming, end-to-end",
    body: "Tokens stream from OpenRouter through our SDK to the browser via SSE. Cancel mid-flight; logs record exactly where the stream stopped.",
  },
  {
    icon: Eye,
    title: "Every call observed",
    body: "Latency, TTFT, token usage, model, status — captured in a fire-and-forget log event for every inference call, queued via BullMQ.",
  },
  {
    icon: ShieldCheck,
    title: "PII never leaves",
    body: "Emails, phone numbers, SSNs, credit cards — redacted at the ingestion worker before they ever touch the database.",
  },
  {
    icon: GitBranch,
    title: "Multi-provider",
    body: "Claude, GPT, Gemini and more through one adapter. Switch models in the picker without touching code.",
  },
  {
    icon: Layers,
    title: "Async ingestion",
    body: "Chat path never blocks on the log write. QStash HTTP queue with idempotent upserts keyed by requestId — at-least-once delivery, exactly-once effects.",
  },
  {
    icon: Activity,
    title: "Real-time dashboard",
    body: "p50/p95 latency, throughput, error rate, per-model breakdown — auto-refreshing every 15 seconds at /admin.",
  },
];

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const sectionY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section id="features" ref={ref} className="relative py-20 px-6">
      <motion.div style={{ y: sectionY }} className="max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="What's inside"
          title="An LLM gateway, not just a chatbot."
          subtitle="The SDK, ingestion pipeline, and dashboard are the actual product. The chat UI is just the demo surface."
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
}) {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/20 transition-colors overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center mb-5 ring-1 ring-white/10">
          <Icon className="size-5 text-white" />
        </div>
        <h3 className="text-white font-medium text-base mb-2">{feature.title}</h3>
        <p className="text-white/55 text-sm leading-relaxed">{feature.body}</p>
      </div>
    </motion.div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 mb-5">
        {eyebrow}
      </div>
      <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white leading-[1.1]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-white/55 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
