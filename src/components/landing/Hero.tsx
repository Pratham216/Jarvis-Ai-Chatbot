"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const LINE_1 = "Chat smarter.";
const LINE_2 = "Log everything.";
const TYPE_SPEED = 65;
const ERASE_SPEED = 28;
const PAUSE_BETWEEN_LINES = 380;
const HOLD_AFTER_FULL = 2200;
const PAUSE_BETWEEN_ERASES = 220;
const PAUSE_BEFORE_RESTART = 500;

type Phase =
  | "typing1"
  | "betweenLines"
  | "typing2"
  | "hold"
  | "erasing2"
  | "betweenErases"
  | "erasing1"
  | "restart";

function HeroHeadline() {
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");
  const [phase, setPhase] = useState<Phase>("typing1");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    switch (phase) {
      case "typing1":
        if (d1.length < LINE_1.length) {
          t = setTimeout(() => setD1(LINE_1.slice(0, d1.length + 1)), TYPE_SPEED);
        } else {
          t = setTimeout(() => setPhase("betweenLines"), PAUSE_BETWEEN_LINES);
        }
        break;
      case "betweenLines":
        t = setTimeout(() => setPhase("typing2"), 0);
        break;
      case "typing2":
        if (d2.length < LINE_2.length) {
          t = setTimeout(() => setD2(LINE_2.slice(0, d2.length + 1)), TYPE_SPEED);
        } else {
          t = setTimeout(() => setPhase("hold"), HOLD_AFTER_FULL);
        }
        break;
      case "hold":
        t = setTimeout(() => setPhase("erasing2"), 0);
        break;
      case "erasing2":
        if (d2.length > 0) {
          t = setTimeout(() => setD2(d2.slice(0, -1)), ERASE_SPEED);
        } else {
          t = setTimeout(() => setPhase("betweenErases"), PAUSE_BETWEEN_ERASES);
        }
        break;
      case "betweenErases":
        t = setTimeout(() => setPhase("erasing1"), 0);
        break;
      case "erasing1":
        if (d1.length > 0) {
          t = setTimeout(() => setD1(d1.slice(0, -1)), ERASE_SPEED);
        } else {
          t = setTimeout(() => setPhase("restart"), PAUSE_BEFORE_RESTART);
        }
        break;
      case "restart":
        t = setTimeout(() => setPhase("typing1"), 0);
        break;
    }
    return () => clearTimeout(t);
  }, [d1, d2, phase]);

  // Single cursor — only render it on the line we're currently writing or
  // erasing on, so it visually jumps between the two lines.
  const cursorOnLine1 = phase === "typing1" || phase === "erasing1";
  const cursorOnLine2 =
    phase === "typing2" || phase === "hold" || phase === "erasing2";

  return (
    <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-white leading-[1.05] min-h-[2.2em]">
      <span>
        {d1}
        {cursorOnLine1 && <Cursor />}
      </span>
      <br />
      <span className="text-white/40">
        {d2}
        {cursorOnLine2 && <Cursor />}
      </span>
    </h1>
  );
}

function Cursor() {
  return (
    <span className="inline-block w-[3px] h-[0.9em] ml-1 align-middle bg-current animate-pulse" />
  );
}

interface Props {
  isSignedIn: boolean;
}

export default function Hero({ isSignedIn }: Props) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Layered background: glow → grid → particles */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-white/[0.05] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>


      <div className="max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 mb-6"
        >
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Built for observability-first AI
        </motion.div>

        <HeroHeadline />

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 text-lg text-white/60 max-w-xl mx-auto leading-relaxed"
        >
          A production-grade chatbot wrapped in its own inference SDK. Every call streamed, every token logged, every error visible — in real time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <Link
            href={isSignedIn ? "/chat" : "/sign-up"}
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
          >
            {isSignedIn ? "Open chat" : "Get started — free"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#features"
            className="px-5 py-2.5 rounded-full border border-white/15 text-white/80 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            See how it works
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 flex flex-col items-center gap-2 text-white/30"
        >
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent"
          />
        </motion.div>
      </div>
    </section>
  );
}
