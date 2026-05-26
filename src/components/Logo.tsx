import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  className?: string;
}

/**
 * Jarvis AI mark — a stylised "J" hooked inside a soft hexagonal frame
 * with a glowing terminal dot. Uses currentColor so it adopts the
 * surrounding text colour.
 */
export default function Logo({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="Jarvis AI"
    >
      <defs>
        <linearGradient id="jarvis-stroke" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="1" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.65" />
        </linearGradient>
        <radialGradient id="jarvis-dot" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="currentColor" stopOpacity="1" />
          <stop offset="0.7" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer hexagonal frame — gives a subtle tech/circuit feel */}
      <path
        d="M20 3.5 L34.27 11.75 L34.27 28.25 L20 36.5 L5.73 28.25 L5.73 11.75 Z"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Inner soft halo */}
      <circle cx="20" cy="20" r="13" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />

      {/* J letterform — top bar + descender + hook */}
      <path
        d="M16 12 L26 12"
        stroke="url(#jarvis-stroke)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M24 12 L24 23 Q24 28.5 18.5 28.5 Q13 28.5 13 23"
        stroke="url(#jarvis-stroke)"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Glowing accent dot at the top — the "AI consciousness" spark */}
      <circle cx="26" cy="12" r="4" fill="url(#jarvis-dot)" />
      <circle cx="26" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}
