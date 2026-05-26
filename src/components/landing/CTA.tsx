"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface Props {
  isSignedIn: boolean;
}

export default function CTA({ isSignedIn }: Props) {
  return (
    <section className="relative py-20 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl mx-auto"
      >
        <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-12 md:p-20 text-center overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06),transparent_60%)]" />
          <div
            className="absolute inset-0 -z-10 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
            }}
          />

          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-white leading-[1.05]">
            Ship it with{" "}
            <span className="text-white/40">eyes open.</span>
          </h2>
          <p className="mt-5 text-white/55 max-w-md mx-auto">
            Sign in and start logging your model calls in under a minute.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href={isSignedIn ? "/chat" : "/sign-up"}
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
            >
              {isSignedIn ? "Open chat" : "Create your account"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            {!isSignedIn && (
              <Link
                href="/sign-in"
                className="px-6 py-3 rounded-full border border-white/15 text-white/80 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
