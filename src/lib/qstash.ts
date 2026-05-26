import { Client, Receiver } from "@upstash/qstash";

/**
 * QStash — Upstash's HTTP-based message queue.
 *
 * Replaces the previous BullMQ + Redis + worker setup. The SDK logger
 * publishes a job to QStash; QStash then POSTs it back to /api/ingest,
 * which validates the signature and writes to Postgres inline.
 *
 * Works on Vercel's serverless platform (no long-lived worker process).
 */

let _client: Client | null = null;
let _receiver: Receiver | null = null;

export function getQStashClient(): Client | null {
  if (_client) return _client;
  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;
  _client = new Client({ token });
  return _client;
}

export function getQStashReceiver(): Receiver | null {
  if (_receiver) return _receiver;
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!current || !next) return null;
  _receiver = new Receiver({
    currentSigningKey: current,
    nextSigningKey: next,
  });
  return _receiver;
}
