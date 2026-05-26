"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.9,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      wheelMultiplier: 1.3,
      touchMultiplier: 1.5,
    });

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // The document grows as fonts load, images decode, etc. If Lenis caches
    // the height before that settles, scroll appears to bottom-out early.
    // ResizeObserver keeps Lenis's internal scroll length in sync.
    const ro = new ResizeObserver(() => lenis.resize());
    ro.observe(document.documentElement);
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
