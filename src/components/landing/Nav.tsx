"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import Logo from "@/components/Logo";

interface Props {
  isSignedIn: boolean;
}

export default function Nav({ isSignedIn }: Props) {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 80], ["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"]);
  const border = useTransform(scrollY, [0, 80], ["rgba(255,255,255,0)", "rgba(255,255,255,0.08)"]);
  const blur = useTransform(scrollY, [0, 80], ["blur(0px)", "blur(16px)"]);

  return (
    <motion.header
      style={{ backgroundColor: bg, borderBottomColor: border, backdropFilter: blur as unknown as string }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-transparent"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-lg bg-white text-black flex items-center justify-center transition-transform group-hover:scale-105">
            <Logo size={20} />
          </div>
          <span className="font-semibold text-sm text-white tracking-tight">Jarvis AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-white/70">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#process" className="hover:text-white transition-colors">How it works</a>
          <a href="#dashboard" className="hover:text-white transition-colors">Dashboard</a>
        </nav>

        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <Link
              href="/chat"
              className="px-3.5 py-1.5 text-sm font-medium rounded-full bg-white text-black hover:bg-white/90 transition-colors"
            >
              Open chat →
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="px-3.5 py-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="px-3.5 py-1.5 text-sm font-medium rounded-full bg-white text-black hover:bg-white/90 transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
