import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { INGEST_QUEUE } from "../lib/queue";
import { prisma } from "../lib/db";
import { redact } from "../lib/redact";
import { InferenceLogEventSchema } from "../lib/ingest-schema";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const worker = new Worker(
  INGEST_QUEUE,
  async (job) => {
    const parsed = InferenceLogEventSchema.safeParse(job.data);
    if (!parsed.success) {
      console.warn("[worker] dropping invalid payload", parsed.error.flatten());
      return;
    }
    const ev = parsed.data;

    const inputRedacted = redact(ev.inputPreview);
    const outputRedacted = redact(ev.outputPreview);
    const redactionHits = {
      input: inputRedacted.hits,
      output: outputRedacted.hits,
    };

    await prisma.inferenceLog.upsert({
      where: { requestId: ev.requestId },
      create: {
        requestId: ev.requestId,
        conversationId: ev.conversationId,
        messageId: ev.messageId,
        provider: ev.provider,
        model: ev.model,
        status: ev.status,
        latencyMs: ev.latencyMs,
        ttftMs: ev.ttftMs,
        promptTokens: ev.promptTokens,
        completionTokens: ev.completionTokens,
        totalTokens: ev.totalTokens,
        inputPreview: inputRedacted.text || null,
        outputPreview: outputRedacted.text || null,
        errorMessage: ev.errorMessage,
        metadata: {
          ...(ev.metadata ?? {}),
          redactionHits,
        },
        startedAt: new Date(ev.startedAt),
        finishedAt: new Date(ev.finishedAt),
      },
      update: {
        status: ev.status,
        latencyMs: ev.latencyMs,
        ttftMs: ev.ttftMs,
        promptTokens: ev.promptTokens,
        completionTokens: ev.completionTokens,
        totalTokens: ev.totalTokens,
        outputPreview: outputRedacted.text || null,
        errorMessage: ev.errorMessage,
        finishedAt: new Date(ev.finishedAt),
      },
    });
  },
  {
    connection,
    concurrency: 10,
  },
);

worker.on("ready", () => console.log("[worker] ready, queue =", INGEST_QUEUE));
worker.on("completed", (job) => console.log("[worker] done", job.id));
worker.on("failed", (job, err) =>
  console.error("[worker] failed", job?.id, err.message),
);
worker.on("error", (err) => console.error("[worker] error", err));

const shutdown = async () => {
  console.log("[worker] shutting down");
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
