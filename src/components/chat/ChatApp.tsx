"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Sidebar from "./Sidebar";
import ChatPane from "./ChatPane";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type {
  Attachment,
  ChatMessageRow,
  ChatUser,
  ConversationSummary,
  ModelOption,
} from "./types";

interface Props {
  defaultModel: string;
  models: ModelOption[];
  currentUser: ChatUser | null;
}

export default function ChatApp({ defaultModel, models, currentUser }: Props) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [model, setModel] = useState(defaultModel);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ConversationSummary | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Smooth typewriter buffer — server chunks arrive in bursts; we drain them
  // to displayed state at a steady rAF cadence so the UI reads like typing.
  const targetTextRef = useRef("");
  const displayedTextRef = useRef("");
  const streamDoneRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const stopDrain = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const drainTick = useCallback(() => {
    const target = targetTextRef.current;
    const shown = displayedTextRef.current;
    if (shown.length < target.length) {
      const remaining = target.length - shown.length;
      // Target ~120 chars/sec while streaming (~2 chars per 60fps frame),
      // with a gentle catch-up when the buffer falls behind. On stream-end,
      // flush at ~400 chars/sec so the tail finishes quickly but still
      // reads like typing.
      let step: number;
      if (streamDoneRef.current) {
        step = Math.max(6, Math.ceil(remaining * 0.1));
      } else if (remaining > 400) {
        step = Math.ceil(remaining * 0.05);
      } else if (remaining > 80) {
        step = 3;
      } else {
        step = remaining > 20 ? 2 : 1;
      }
      const next = target.slice(0, shown.length + step);
      displayedTextRef.current = next;
      setStreamingText(next);
    }
    if (
      displayedTextRef.current.length < targetTextRef.current.length ||
      !streamDoneRef.current
    ) {
      rafRef.current = requestAnimationFrame(drainTick);
    } else {
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => stopDrain(), [stopDrain]);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.items);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const selectConversation = useCallback(
    async (id: string) => {
      if (isStreaming) return;
      setActiveId(id);
      setError(null);
      setAttachments([]);
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    },
    [isStreaming],
  );

  const newChat = useCallback(() => {
    if (isStreaming) abortRef.current?.abort();
    setActiveId(null);
    setMessages([]);
    setStreamingText("");
    setAttachments([]);
    setError(null);
  }, [isStreaming]);

  const requestDeleteConversation = useCallback(
    (id: string) => {
      const item = conversations.find((c) => c.id === id);
      if (item) setPendingDelete(item);
    },
    [conversations],
  );

  const confirmDelete = useCallback(async () => {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    const res = await fetch(`/api/conversations/${target.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Couldn't delete conversation");
      return;
    }
    if (target.id === activeId) newChat();
    loadConversations();
    toast.success("Conversation deleted", { duration: 1500 });
  }, [pendingDelete, activeId, newChat, loadConversations]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const addAttachments = useCallback((atts: Attachment[]) => {
    setAttachments((prev) => [...prev, ...atts].slice(0, 6));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const sendRaw = useCallback(
    async (
      content: string,
      atts: Attachment[],
      opts: { conversationIdOverride?: string | null } = {},
    ) => {
      setError(null);

      const images = atts.filter((a) => a.kind === "image" && a.dataUrl).map((a) => a.dataUrl!);
      const textParts = atts
        .filter((a) => a.text)
        .map((a) => `### ${a.name}\n${a.text}`);
      const attachmentText = textParts.length > 0 ? textParts.join("\n\n") : undefined;

      const targetConvoId =
        opts.conversationIdOverride !== undefined
          ? opts.conversationIdOverride
          : activeId;

      // Optimistic user message
      const tempId = `temp-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          role: "user",
          content,
          createdAt: new Date().toISOString(),
        },
      ]);
      // Reset typewriter buffer and start draining
      targetTextRef.current = "";
      displayedTextRef.current = "";
      streamDoneRef.current = false;
      setStreamingText("");
      stopDrain();
      rafRef.current = requestAnimationFrame(drainTick);

      setIsStreaming(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      let receivedConversationId = targetConvoId;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: targetConvoId ?? undefined,
            model,
            content,
            images: images.length > 0 ? images : undefined,
            attachmentText,
          }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          const errBody = await res.text().catch(() => "");
          throw new Error(`Server ${res.status}: ${errBody || res.statusText}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let assembled = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let sep: number;
          while ((sep = buf.indexOf("\n\n")) !== -1) {
            const raw = buf.slice(0, sep);
            buf = buf.slice(sep + 2);
            const lines = raw.split("\n");
            let event = "message";
            let dataStr = "";
            for (const line of lines) {
              if (line.startsWith("event:")) event = line.slice(6).trim();
              else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
            }
            if (!dataStr) continue;
            let data: Record<string, unknown>;
            try {
              data = JSON.parse(dataStr);
            } catch {
              continue;
            }

            if (event === "meta") {
              receivedConversationId =
                (data.conversationId as string) ?? receivedConversationId;
              if (!targetConvoId && receivedConversationId) {
                setActiveId(receivedConversationId);
              }
            } else if (event === "delta") {
              const piece = (data.content as string) ?? "";
              assembled += piece;
              targetTextRef.current = assembled;
              if (rafRef.current === null) {
                rafRef.current = requestAnimationFrame(drainTick);
              }
            } else if (event === "done") {
              if (data.status === "error" && typeof data.errorMessage === "string") {
                setError(data.errorMessage);
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setError("Cancelled.");
        } else {
          setError((err as Error).message);
        }
      } finally {
        // Mark stream done so the drain loop flushes the remaining buffer.
        streamDoneRef.current = true;
        if (
          rafRef.current === null &&
          targetTextRef.current.length > displayedTextRef.current.length
        ) {
          rafRef.current = requestAnimationFrame(drainTick);
        }

        // Wait (briefly, bounded) for the typewriter to finish revealing,
        // so the bubble's final text is fully on-screen before we swap it
        // out for a permanent message.
        const drainStart = Date.now();
        while (
          displayedTextRef.current.length < targetTextRef.current.length &&
          Date.now() - drainStart < 600
        ) {
          await new Promise((r) => setTimeout(r, 40));
        }
        stopDrain();

        const finalText = targetTextRef.current;

        // Atomically replace the streaming bubble with a local assistant
        // message containing the same text. Same React batch ⇒ no flash.
        if (finalText.length > 0) {
          const optimisticAssistant: ChatMessageRow = {
            id: `temp-asst-${Date.now()}`,
            role: "assistant",
            content: finalText,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, optimisticAssistant]);
        }
        setStreamingText("");
        setIsStreaming(false);
        targetTextRef.current = "";
        displayedTextRef.current = "";
        abortRef.current = null;

        // Background reconcile — fetches authoritative rows (with real UUIDs).
        // Content is identical to the optimistic versions, so this re-render
        // is invisible to the user.
        if (receivedConversationId) {
          fetch(`/api/conversations/${receivedConversationId}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.messages) setMessages(data.messages);
            })
            .catch(() => {});
        }
        loadConversations();
      }
    },
    [activeId, model, loadConversations],
  );

  const send = useCallback(async () => {
    const content = input.trim();
    if (!content && attachments.length === 0) return;
    if (isStreaming) return;
    const atts = attachments;
    setInput("");
    setAttachments([]);
    await sendRaw(content || "(see attached)", atts);
  }, [input, attachments, isStreaming, sendRaw]);

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (isStreaming) return;
      if (!activeId) return;
      if (messageId.startsWith("temp-")) return;

      // Optimistic: trim local state to before the edited message
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      setMessages(messages.slice(0, idx));
      setError(null);

      // Delete the message + everything after, server-side
      const delRes = await fetch(
        `/api/messages/${messageId}?cascade=true`,
        { method: "DELETE" },
      );
      if (!delRes.ok) {
        setError("Failed to edit message");
        return;
      }

      toast("Regenerating reply…", { duration: 1500 });
      await sendRaw(newContent, [], { conversationIdOverride: activeId });
    },
    [activeId, isStreaming, messages, sendRaw],
  );

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        items={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={newChat}
        onDelete={requestDeleteConversation}
        loading={loading}
        currentUser={currentUser}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete conversation?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" and all its messages will be permanently deleted. This can't be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <ChatPane
        messages={messages}
        streamingText={streamingText}
        isStreaming={isStreaming}
        input={input}
        setInput={setInput}
        onSend={send}
        onCancel={cancel}
        onEditMessage={editMessage}
        attachments={attachments}
        onAddAttachments={addAttachments}
        onRemoveAttachment={removeAttachment}
        model={model}
        setModel={setModel}
        models={models}
        error={error}
        currentUser={currentUser}
      />
    </div>
  );
}
