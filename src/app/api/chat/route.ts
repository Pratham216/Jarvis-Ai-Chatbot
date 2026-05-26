import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getLLMClient } from "@/lib/llm";
import type { ChatMessage } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  model: z.string().min(1),
  content: z.string().min(1).max(8000),
  systemPrompt: z.string().max(2000).optional(),
  /** Image data URLs (base64). Forwarded to vision-capable models. */
  images: z.array(z.string().max(8 * 1024 * 1024)).max(6).optional(),
  /** Plain-text content extracted from non-image attachments. Appended as context. */
  attachmentText: z.string().max(20000).optional(),
});

const CONTEXT_TURNS = 20;

function sseEncode(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "validation failed", details: parsed.error.flatten() }),
      { status: 422 },
    );
  }
  const { conversationId, model, content, systemPrompt, images, attachmentText } = parsed.data;
  const fullContent = attachmentText
    ? `${content}\n\n--- Attached files ---\n${attachmentText}`
    : content;

  // Resolve or create conversation
  const convo = conversationId
    ? await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: CONTEXT_TURNS,
          },
        },
      })
    : await prisma.conversation.create({
        data: { title: content.slice(0, 60), userId },
        include: { messages: true },
      });

  if (!convo) {
    return new Response(JSON.stringify({ error: "conversation not found" }), {
      status: 404,
    });
  }
  if (convo.userId !== userId) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  if (convo.status === "cancelled" || convo.status === "archived") {
    return new Response(JSON.stringify({ error: "conversation is closed" }), {
      status: 409,
    });
  }

  // Persist user message (stores the combined text content; image data URLs are
  // ephemeral and not persisted — we only forward them to the model on this turn).
  const userMessage = await prisma.message.create({
    data: {
      conversationId: convo.id,
      role: "user",
      content: fullContent,
    },
  });

  // Build the message window
  const messages: ChatMessage[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  for (const m of convo.messages) {
    messages.push({ role: m.role as ChatMessage["role"], content: m.content });
  }
  messages.push({
    role: "user",
    content: fullContent,
    images: images && images.length > 0 ? images : undefined,
  });

  const requestId = nanoid();
  const client = getLLMClient();
  const abort = new AbortController();

  // If the client disconnects, abort the upstream call
  req.signal.addEventListener("abort", () => abort.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // First event tells the client the conversation/message ids
      controller.enqueue(
        sseEncode("meta", {
          conversationId: convo.id,
          userMessageId: userMessage.id,
          requestId,
        }),
      );

      let assembled = "";
      let status: "success" | "error" | "cancelled" = "success";
      let errorMessage: string | undefined;

      try {
        for await (const chunk of client.stream(
          { model, messages, maxTokens: 800, temperature: 0.7 },
          { requestId, conversationId: convo.id },
          abort.signal,
        )) {
          if (chunk.delta) {
            assembled += chunk.delta;
            controller.enqueue(sseEncode("delta", { content: chunk.delta }));
          }
          if (chunk.usage) {
            controller.enqueue(sseEncode("usage", chunk.usage));
          }
        }
      } catch (err) {
        if (abort.signal.aborted) {
          status = "cancelled";
        } else {
          status = "error";
          errorMessage = err instanceof Error ? err.message : String(err);
        }
      }

      // Persist assistant message (whatever was assembled, even on cancel/error)
      if (assembled.length > 0 || status !== "error") {
        const assistantMessage = await prisma.message.create({
          data: {
            conversationId: convo.id,
            role: "assistant",
            content: assembled,
          },
        });
        // Link the in-flight log to the assistant message id. We use
        // updateMany (not update) because the worker may not have inserted
        // the log row yet — a zero-row update is a silent no-op instead of
        // a thrown "record not found" error. If the worker writes after us,
        // it carries the messageId in its own upsert payload.
        await prisma.inferenceLog.updateMany({
          where: { requestId },
          data: { messageId: assistantMessage.id },
        });
      }

      await prisma.conversation.update({
        where: { id: convo.id },
        data: { updatedAt: new Date() },
      });

      controller.enqueue(sseEncode("done", { status, errorMessage }));
      controller.close();
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
