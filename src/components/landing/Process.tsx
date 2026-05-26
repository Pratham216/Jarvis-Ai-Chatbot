"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { SectionHeader } from "./Features";

const STEPS = [
  {
    n: "01",
    title: "Wrap the model call",
    body: "The SDK adapter streams tokens from any OpenRouter model. Timing, usage, and status are captured automatically — your code stays a one-liner.",
    code: "for await (const chunk of client.stream(req, ctx)) {\n  yield chunk;\n}",
  },
  {
    n: "02",
    title: "Fire log → queue",
    body: "On stream close, a single log event is POSTed to /api/ingest without awaiting. Zod-validated, then pushed to BullMQ keyed by requestId for idempotency.",
    code: "sink.emit({ requestId, model, latencyMs, tokens, status })",
  },
  {
    n: "03",
    title: "Worker → Postgres",
    body: "A separate worker process drains the queue, redacts PII, and upserts into inference_logs. The dashboard reads it within seconds.",
    code: "await prisma.inferenceLog.upsert({ where, create, update })",
  },
];

export default function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  return (
    <section id="process" ref={ref} className="relative py-20 px-6 bg-gradient-to-b from-transparent via-white/[0.015] to-transparent">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          eyebrow="How it works"
          title="Three steps. One log per call."
        />

        <div className="mt-20 space-y-24">
          {STEPS.map((step, i) => (
            <StepRow key={step.n} step={step} index={i} progress={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepRow({
  step,
  index,
  progress,
}: {
  step: (typeof STEPS)[number];
  index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const rotateY = useTransform(
    progress,
    [index * 0.25, index * 0.25 + 0.4],
    [index % 2 === 0 ? -12 : 12, 0],
  );
  const reverse = index % 2 === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col md:flex-row gap-10 items-center ${reverse ? "md:flex-row-reverse" : ""}`}
    >
      <div className="flex-1">
        <div className="text-7xl font-semibold text-white/10 mb-3 tracking-tighter">
          {step.n}
        </div>
        <h3 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-3">
          {step.title}
        </h3>
        <p className="text-white/55 leading-relaxed max-w-md">{step.body}</p>
      </div>

      <motion.div
        style={{ rotateY, transformPerspective: 1200 }}
        className="flex-1 w-full"
      >
        <div className="rounded-xl border border-white/10 bg-zinc-950 p-5 shadow-[0_20px_80px_-20px_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="size-2 rounded-full bg-white/10" />
            <div className="size-2 rounded-full bg-white/10" />
            <div className="size-2 rounded-full bg-white/10" />
          </div>
          <pre className="text-xs font-mono text-white/75 leading-relaxed whitespace-pre-wrap">
            {step.code}
          </pre>
        </div>
      </motion.div>
    </motion.div>
  );
}
