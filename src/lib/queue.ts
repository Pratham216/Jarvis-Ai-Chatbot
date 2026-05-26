import { Queue } from "bullmq";
import IORedis from "ioredis";

export const INGEST_QUEUE = "inference-logs";

let _redis: IORedis | null = null;
let _queue: Queue | null = null;

export function getRedis(): IORedis {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  _redis = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  return _redis;
}

export function getIngestQueue(): Queue {
  if (_queue) return _queue;
  _queue = new Queue(INGEST_QUEUE, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400 },
    },
  });
  return _queue;
}
