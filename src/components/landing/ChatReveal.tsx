"use client";

import { useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { Sparkles, User as UserIcon } from "lucide-react";

type Role = "user" | "assistant";

interface Msg {
  role: Role;
  content: React.ReactNode;
}

const MESSAGES: Msg[] = [
  {
    role: "user",
    content: "What's the difference between latency and throughput?",
  },
  {
    role: "assistant",
    content: (
      <>
        <p>
          <strong className="text-white">Latency</strong> measures how long a
          single request takes end-to-end — usually in milliseconds.{" "}
          <strong className="text-white">Throughput</strong> measures how many
          requests the system can handle per second.
        </p>
        <p className="text-white/55 mt-2 text-xs leading-relaxed">
          A system can have low latency but low throughput, or vice versa. Both
          matter, but for different reasons.
        </p>
      </>
    ),
  },
  {
    role: "user",
    content: "Show me the p95 latency over the last hour.",
  },
  {
    role: "assistant",
    content: (
      <>
        <p>Querying the inference logs…</p>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/50">
          <span className="inline-block size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>3 sources · 1,284 records scanned</span>
        </div>
      </>
    ),
  },
  {
    role: "user",
    content: "Anything weird going on right now?",
  },
  {
    role: "assistant",
    content: (
      <>
        <p>All clear — error rate is at 0.4% across all providers.</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
          <div className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5">
            <div className="text-white/40">Gemini</div>
            <div className="text-white/90 font-medium">412 ms</div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5">
            <div className="text-white/40">GPT-4o</div>
            <div className="text-white/90 font-medium">680 ms</div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5">
            <div className="text-white/40">Claude</div>
            <div className="text-white/90 font-medium">540 ms</div>
          </div>
        </div>
      </>
    ),
  },
];

// Section is 300vh tall and the chat is sticky-pinned to the viewport center.
// Sticky pinning is active for progress ~0.25 → ~0.75 (i.e. a 200vh stretch
// of page scroll). Reveal thresholds are spaced 0.08 apart so each message
// requires ~32vh of scrolling to reach — roughly a third of a viewport,
// or ~2 deliberate wheel ticks with Lenis. Slower than chunky chat-bursts,
// closer to scrubbing through a video.
const REVEAL_AT = [0.3, 0.38, 0.46, 0.54, 0.62, 0.7];
const TYPING_HIDDEN_AT = 0.74;

export default function ChatReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const [visibleCount, setVisibleCount] = useState(0);
  const [typingDone, setTypingDone] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const n = REVEAL_AT.filter((t) => v >= t).length;
    if (n !== visibleCount) setVisibleCount(n);
    const done = v >= TYPING_HIDDEN_AT;
    if (done !== typingDone) setTypingDone(done);
  });

  return (
    <section ref={ref} className="relative" style={{ height: "300vh" }}>
      <div className="sticky top-0 h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-3xl">
          <ChatWindow>
            <LayoutGroup>
              <AnimatePresence initial={false}>
                {MESSAGES.slice(0, visibleCount).map((m, i) => (
                  <motion.div
                    key={i}
                    layout="position"
                    initial={{ opacity: 0, scale: 0.94, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{
                      opacity: { duration: 0.55, ease: "easeOut" },
                      scale: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                      filter: { duration: 0.55, ease: "easeOut" },
                      layout: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                    }}
                    style={{ transformOrigin: m.role === "user" ? "right bottom" : "left bottom" }}
                  >
                    <Bubble role={m.role}>{m.content}</Bubble>
                  </motion.div>
                ))}
              </AnimatePresence>

              <AnimatePresence>
                {!typingDone && (
                  <motion.div
                    key="typing"
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                    transition={{
                      opacity: { duration: 0.35 },
                      layout: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                    }}
                    className="flex items-start gap-3"
                  >
                    <Avatar role="assistant" />
                    <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-white/5 border border-white/10">
                      <TypingDots />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </LayoutGroup>
          </ChatWindow>
        </div>
      </div>
    </section>
  );
}

function ChatWindow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur shadow-[0_30px_120px_-20px_rgba(255,255,255,0.15)] overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
        <div className="size-2.5 rounded-full bg-white/15" />
        <div className="size-2.5 rounded-full bg-white/15" />
        <div className="size-2.5 rounded-full bg-white/15" />
        <div className="ml-4 text-[10px] text-white/40 font-mono">
          chatbot · gemini-2.5-flash
        </div>
      </div>
      <div className="p-6 space-y-4 h-[560px] flex flex-col justify-end overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Bubble({ role, children }: { role: Role; children: React.ReactNode }) {
  if (role === "user") {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="rounded-2xl rounded-tr-md px-4 py-2 text-sm bg-white text-black max-w-[78%]">
          {children}
        </div>
        <Avatar role="user" />
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <Avatar role="assistant" />
      <div className="text-sm text-white/90 leading-relaxed max-w-[78%]">{children}</div>
    </div>
  );
}

function Avatar({ role }: { role: Role }) {
  if (role === "user") {
    return (
      <div className="size-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
        <UserIcon className="size-3.5 text-white/70" />
      </div>
    );
  }
  return (
    <div className="size-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
      <Sparkles className="size-3.5 text-white" />
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-1.5 rounded-full bg-white/60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.18,
          }}
        />
      ))}
    </span>
  );
}
