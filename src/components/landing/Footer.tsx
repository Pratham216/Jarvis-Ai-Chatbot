"use client";

import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 px-6 py-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-6 items-start">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-white text-black flex items-center justify-center">
            <Logo size={20} />
          </div>
          <span className="font-semibold text-sm text-white tracking-tight">Jarvis AI</span>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs text-white/50">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#process" className="hover:text-white transition-colors">How it works</a>
          <a href="#dashboard" className="hover:text-white transition-colors">Dashboard</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </div>
        <p className="text-xs text-white/30">
          Built with Next.js, Postgres, Upstash QStash & OpenRouter.
        </p>
      </div>
    </footer>
  );
}
