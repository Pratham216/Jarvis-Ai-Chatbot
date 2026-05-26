"use client";

import { useEffect, useRef } from "react";

interface Particle {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  hue: number; // 0 = white, 1 = subtle accent
}

interface Props {
  /** Number of particles to render. Lowered automatically on mobile. */
  count?: number;
  /** Radius (px) within which particles flee from the cursor. */
  repelRadius?: number;
  /** How forcefully particles flee. */
  repelStrength?: number;
}

/**
 * Canvas-based starfield with mouse repulsion. Particles are seeded in a
 * soft cluster around the centre of their container, drift gently toward
 * their "home" position via a spring, and scatter away from the cursor
 * within a configurable radius.
 *
 * Render inside a positioned parent — the canvas is absolute inset-0.
 */
export default function ParticleField({
  count = 820,
  repelRadius = 190,
  repelStrength = 2.8,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobile = window.innerWidth < 640;
    const N = isMobile ? Math.floor(count * 0.45) : count;

    let particles: Particle[] = [];
    let animId = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const seed = () => {
      // Fixed-positioned canvas covers the viewport. Particles are seeded
      // for the visible area; as the user scrolls, the field stays anchored
      // to the viewport so the cursor-repel interaction works on every
      // section of the page.
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.max(width, height) * 0.7;

      particles = [];
      for (let i = 0; i < N; i++) {
        // Mostly uniform across the viewport with a soft centre bias so the
        // field has a natural cluster but extends to the edges.
        let x: number, y: number;
        if (Math.random() < 0.65) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.pow(Math.random(), 0.7) * maxR * 0.55;
          x = cx + Math.cos(angle) * r;
          y = cy + Math.sin(angle) * r;
        } else {
          x = Math.random() * width;
          y = Math.random() * height;
        }
        particles.push({
          homeX: x,
          homeY: y,
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 0.5 + Math.random() * 1.5,
          opacity: 0.15 + Math.random() * 0.5,
          hue: Math.random() < 0.85 ? 0 : 1,
        });
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const active = mouseRef.current.active;
      const rr2 = repelRadius * repelRadius;

      for (const p of particles) {
        if (active) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const distSq = dx * dx + dy * dy;
          if (distSq < rr2 && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const falloff = 1 - dist / repelRadius;
            const force = (falloff * falloff * repelStrength) / dist;
            p.vx += dx * force;
            p.vy += dy * force;
          }
        }

        // Spring back to home position — slightly gentler so particles
        // drift further before settling.
        p.vx += (p.homeX - p.x) * 0.014;
        p.vy += (p.homeY - p.y) * 0.014;

        // Lighter damping → more swing, more dramatic scatter.
        p.vx *= 0.91;
        p.vy *= 0.91;

        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        if (p.hue === 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        } else {
          // Subtle indigo accent matching the rest of the brand
          ctx.fillStyle = `rgba(165, 180, 252, ${p.opacity * 0.85})`;
        }
        ctx.fill();
      }

      animId = requestAnimationFrame(tick);
    };

    seed();
    tick();

    const onResize = () => seed();
    const onMouseMove = (e: MouseEvent) => {
      // Canvas is fixed-position so clientX/Y already maps to canvas space.
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      mouseRef.current = { x: t.clientX, y: t.clientY, active: true };
    };
    const onTouchEnd = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [count, repelRadius, repelStrength]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden
    />
  );
}
