/**
 * Lightweight PII redactor. Runs on log payloads (input/output previews)
 * before persisting to the database. Patterns are intentionally
 * conservative — better to over-redact than to leak.
 */

const PATTERNS: Array<{ name: string; re: RegExp; repl: string }> = [
  {
    name: "email",
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    repl: "[REDACTED_EMAIL]",
  },
  {
    name: "phone",
    re: /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,
    repl: "[REDACTED_PHONE]",
  },
  {
    name: "ssn",
    re: /\b\d{3}-\d{2}-\d{4}\b/g,
    repl: "[REDACTED_SSN]",
  },
  {
    name: "credit_card",
    re: /\b(?:\d[ -]?){13,16}\b/g,
    repl: "[REDACTED_CC]",
  },
  {
    name: "ipv4",
    re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    repl: "[REDACTED_IP]",
  },
  {
    name: "api_key",
    re: /\b(?:sk|pk|api)[-_][A-Za-z0-9]{16,}\b/g,
    repl: "[REDACTED_KEY]",
  },
];

export interface RedactResult {
  text: string;
  hits: Record<string, number>;
}

export function redact(text: string | null | undefined): RedactResult {
  if (!text) return { text: "", hits: {} };
  let out = text;
  const hits: Record<string, number> = {};
  for (const { name, re, repl } of PATTERNS) {
    const matches = out.match(re);
    if (matches?.length) {
      hits[name] = matches.length;
      out = out.replace(re, repl);
    }
  }
  return { text: out, hits };
}
