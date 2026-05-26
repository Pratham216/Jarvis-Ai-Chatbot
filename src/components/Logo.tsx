import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  className?: string;
}

/**
 * Jarvis AI mark — Arc-Reactor / Iron-Man HUD with four live animations:
 *
 *  1. Outer targeting ring + ticks  — slow counter-clockwise drift  (40 s / rev)
 *  2. Three scan-arc segments       — clockwise sweep               ( 8 s / rev)
 *  3. Hex vertex nodes              — sequential circuit pulse       ( 2.4 s period, 0.4 s stagger)
 *  4. Energy core                   — concentric breathing glow      ( 2 s / beat)
 *
 * Pure SVG SMIL — no JS, no "use client" needed.
 */
export default function Logo({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="Jarvis AI"
    >
      {/* ── Static corner-bracket targeting reticle ──────────────────────── */}
      <path
        d="M 26.25,5.75 L 24,5.75 M 26.25,5.75 L 26.25,8"
        stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.7"
      />
      <path
        d="M 5.75,26.25 L 8,26.25 M 5.75,26.25 L 5.75,24"
        stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.7"
      />

      {/* ── Outer ring + ticks: slow CCW drift ───────────────────────────── */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 16 16"
          to="-360 16 16"
          dur="40s"
          repeatCount="indefinite"
        />
        <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="0.5" opacity="0.28" />
        {/* cardinal ticks */}
        <line x1="30.5" y1="16"   x2="27.6" y2="16"   stroke="currentColor" strokeWidth="1.1" />
        <line x1="1.5"  y1="16"   x2="4.4"  y2="16"   stroke="currentColor" strokeWidth="1.1" />
        <line x1="16"   y1="1.5"  x2="16"   y2="4.4"  stroke="currentColor" strokeWidth="1.1" />
        <line x1="16"   y1="30.5" x2="16"   y2="27.6" stroke="currentColor" strokeWidth="1.1" />
        {/* diagonal ticks */}
        <line x1="26.25" y1="26.25" x2="25.06" y2="25.06" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
        <line x1="5.75"  y1="26.25" x2="6.94"  y2="25.06" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
        <line x1="5.75"  y1="5.75"  x2="6.94"  y2="6.94"  stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
        <line x1="26.25" y1="5.75"  x2="25.06" y2="6.94"  stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
      </g>

      {/* ── Scan arcs: CW sweep at 8 s / revolution ──────────────────────── */}
      {/*
        Arc 1:  0°→100°   (27,16) → (14.09,26.83)
        Arc 2: 120°→220°  (10.5,25.53) → (7.57,8.93)
        Arc 3: 240°→340°  (10.5,6.47) → (26.34,12.24)
        All clockwise (sweep=1), small arc (large-arc=0).
      */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 16 16"
          to="360 16 16"
          dur="8s"
          repeatCount="indefinite"
        />
        <path d="M 27,16 A 11,11 0 0,1 14.09,26.83"     stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M 10.5,25.53 A 11,11 0 0,1 7.57,8.93"  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M 10.5,6.47 A 11,11 0 0,1 26.34,12.24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        {/* arc endpoint connection nodes */}
        <circle cx="27"    cy="16"    r="0.85" fill="currentColor" />
        <circle cx="14.09" cy="26.83" r="0.85" fill="currentColor" />
        <circle cx="10.5"  cy="25.53" r="0.85" fill="currentColor" />
        <circle cx="7.57"  cy="8.93"  r="0.85" fill="currentColor" />
        <circle cx="10.5"  cy="6.47"  r="0.85" fill="currentColor" />
        <circle cx="26.34" cy="12.24" r="0.85" fill="currentColor" />
      </g>

      {/* ── Static inner hexagon + radial spokes ─────────────────────────── */}
      {/*  r=7, pointy-top: (16,9) (22.06,12.5) (22.06,19.5) (16,23) (9.94,19.5) (9.94,12.5)  */}
      <polygon
        points="16,9 22.06,12.5 22.06,19.5 16,23 9.94,19.5 9.94,12.5"
        stroke="currentColor" strokeWidth="0.9" opacity="0.55"
      />
      {/* spokes r=3→5.5 at hex-vertex angles */}
      <line x1="16"   y1="13"   x2="16"    y2="10.5"  stroke="currentColor" strokeWidth="0.55" opacity="0.38" />
      <line x1="18.6" y1="14.5" x2="20.76" y2="13.25" stroke="currentColor" strokeWidth="0.55" opacity="0.38" />
      <line x1="18.6" y1="17.5" x2="20.76" y2="18.75" stroke="currentColor" strokeWidth="0.55" opacity="0.38" />
      <line x1="16"   y1="19"   x2="16"    y2="21.5"  stroke="currentColor" strokeWidth="0.55" opacity="0.38" />
      <line x1="13.4" y1="17.5" x2="11.24" y2="18.75" stroke="currentColor" strokeWidth="0.55" opacity="0.38" />
      <line x1="13.4" y1="14.5" x2="11.24" y2="13.25" stroke="currentColor" strokeWidth="0.55" opacity="0.38" />

      {/* ── Hex vertex nodes: sequential circuit pulse (0.4 s stagger) ────── */}
      {/* v0 top      270° begin=0.0s */}
      <circle cx="16"    cy="9"    r="0.75" fill="currentColor" opacity="0.85">
        <animate attributeName="r"       values="0.75;1.45;0.75" dur="2.4s" begin="0s"   repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
        <animate attributeName="opacity" values="0.85;1;0.85"     dur="2.4s" begin="0s"   repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
      </circle>
      {/* v1 upper-right 330° begin=0.4s */}
      <circle cx="22.06" cy="12.5" r="0.75" fill="currentColor" opacity="0.85">
        <animate attributeName="r"       values="0.75;1.45;0.75" dur="2.4s" begin="0.4s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
        <animate attributeName="opacity" values="0.85;1;0.85"     dur="2.4s" begin="0.4s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
      </circle>
      {/* v2 lower-right 30° begin=0.8s */}
      <circle cx="22.06" cy="19.5" r="0.75" fill="currentColor" opacity="0.85">
        <animate attributeName="r"       values="0.75;1.45;0.75" dur="2.4s" begin="0.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
        <animate attributeName="opacity" values="0.85;1;0.85"     dur="2.4s" begin="0.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
      </circle>
      {/* v3 bottom 90° begin=1.2s */}
      <circle cx="16"    cy="23"   r="0.75" fill="currentColor" opacity="0.85">
        <animate attributeName="r"       values="0.75;1.45;0.75" dur="2.4s" begin="1.2s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
        <animate attributeName="opacity" values="0.85;1;0.85"     dur="2.4s" begin="1.2s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
      </circle>
      {/* v4 lower-left 150° begin=1.6s */}
      <circle cx="9.94"  cy="19.5" r="0.75" fill="currentColor" opacity="0.85">
        <animate attributeName="r"       values="0.75;1.45;0.75" dur="2.4s" begin="1.6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
        <animate attributeName="opacity" values="0.85;1;0.85"     dur="2.4s" begin="1.6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
      </circle>
      {/* v5 upper-left 210° begin=2.0s */}
      <circle cx="9.94"  cy="12.5" r="0.75" fill="currentColor" opacity="0.85">
        <animate attributeName="r"       values="0.75;1.45;0.75" dur="2.4s" begin="2.0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
        <animate attributeName="opacity" values="0.85;1;0.85"     dur="2.4s" begin="2.0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
      </circle>

      {/* ── Energy core: concentric breathing glow ───────────────────────── */}
      {/* outermost halo */}
      <circle cx="16" cy="16" r="4.2" fill="currentColor">
        <animate attributeName="opacity" values="0.05;0.18;0.05" dur="2.6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
      </circle>
      {/* mid halo */}
      <circle cx="16" cy="16" r="3" fill="currentColor">
        <animate attributeName="opacity" values="0.10;0.30;0.10" dur="2.2s" begin="0.25s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
      </circle>
      {/* inner halo */}
      <circle cx="16" cy="16" r="2" fill="currentColor">
        <animate attributeName="opacity" values="0.20;0.52;0.20" dur="1.9s" begin="0.12s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
      </circle>
      {/* solid core dot — subtle size pulse */}
      <circle cx="16" cy="16" r="1.2" fill="currentColor">
        <animate attributeName="r" values="1.2;1.55;1.2" dur="2s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" />
      </circle>
    </svg>
  );
}
