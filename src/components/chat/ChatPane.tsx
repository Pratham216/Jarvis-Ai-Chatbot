"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Square, Sparkles, AlertCircle, ChevronDown, Check, Paperclip, Image as ImageIcon, Search, X as XIcon, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MessageBubble from "./MessageBubble";
import AttachmentChip from "./AttachmentChip";
import type { Attachment, ChatMessageRow, ChatUser, ModelOption } from "./types";

interface Props {
  messages: ChatMessageRow[];
  streamingText: string;
  isStreaming: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onEditMessage: (id: string, newContent: string) => void;
  attachments: Attachment[];
  onAddAttachments: (atts: Attachment[]) => void;
  onRemoveAttachment: (id: string) => void;
  model: string;
  setModel: (v: string) => void;
  models: ModelOption[];
  error: string | null;
  currentUser: ChatUser | null;
}

const SUGGESTIONS = [
  "Explain how transformers work, in plain English.",
  "Write a haiku about observability.",
  "What's the difference between latency and throughput?",
  "Draft a polite Slack message asking for a code review.",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const TEXTY_MIMES = /^(text\/|application\/(json|xml|x-yaml|yaml))/;

async function fileToAttachment(file: File): Promise<Attachment | null> {
  if (file.size > MAX_FILE_SIZE) {
    toast.error(`${file.name} is too large (max 5 MB)`);
    return null;
  }
  const id = crypto.randomUUID();
  const isImage = file.type.startsWith("image/");
  if (isImage) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    return {
      id,
      name: file.name || "pasted-image.png",
      size: file.size,
      mime: file.type,
      kind: "image",
      dataUrl,
    };
  }
  let text: string | undefined;
  if (TEXTY_MIMES.test(file.type) || /\.(md|txt|json|csv|yaml|yml|log)$/i.test(file.name)) {
    try {
      text = (await file.text()).slice(0, 20000);
    } catch {
      // ignore
    }
  }
  return {
    id,
    name: file.name,
    size: file.size,
    mime: file.type || "application/octet-stream",
    kind: "file",
    text,
  };
}

export default function ChatPane({
  messages,
  streamingText,
  isStreaming,
  input,
  setInput,
  onSend,
  onCancel,
  onEditMessage,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  model,
  setModel,
  models,
  error,
  currentUser,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll: while streaming, lock to the bottom (no smooth animation —
  // it fights the typewriter and looks jittery). For non-streaming updates
  // (e.g. loading a conversation), do a one-time smooth scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isStreaming) {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, streamingText, isStreaming]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    const remaining = 6 - attachments.length;
    if (remaining <= 0) {
      toast.error("Up to 6 attachments per message");
      return;
    }
    const toProcess = arr.slice(0, remaining);
    const processed = (
      await Promise.all(toProcess.map(fileToAttachment))
    ).filter((a): a is Attachment => a !== null);
    if (processed.length > 0) {
      onAddAttachments(processed);
      const imageCount = processed.filter((p) => p.kind === "image").length;
      const fileCount = processed.length - imageCount;
      const parts: string[] = [];
      if (imageCount) parts.push(`${imageCount} image${imageCount === 1 ? "" : "s"}`);
      if (fileCount) parts.push(`${fileCount} file${fileCount === 1 ? "" : "s"}`);
      toast.success(`Attached ${parts.join(" + ")}`, { duration: 1500 });
    }
  };

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      await handleFiles(files);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && (input.trim() || attachments.length > 0)) onSend();
    }
  };

  const canSend = !isStreaming && (input.trim().length > 0 || attachments.length > 0);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatch, setCurrentMatch] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const matchCount = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return 0;
    return messages.reduce(
      (sum, m) =>
        sum + (m.content.toLowerCase().split(q).length - 1),
      0,
    );
  }, [messages, searchQuery]);

  // Reset to first match whenever the query changes.
  useEffect(() => {
    setCurrentMatch(0);
  }, [searchQuery]);

  // After render, locate every <mark> in the scroll container, mark the
  // active one with a class, and scroll it into view.
  useEffect(() => {
    if (!searchQuery.trim() || !scrollRef.current) return;
    const marks = scrollRef.current.querySelectorAll<HTMLElement>("mark");
    marks.forEach((el, i) => {
      if (i === currentMatch) {
        el.classList.add("search-match-active");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        el.classList.remove("search-match-active");
      }
    });
    return () => {
      marks.forEach((el) => el.classList.remove("search-match-active"));
    };
  }, [searchQuery, currentMatch, messages]);

  const nextMatch = useCallback(() => {
    if (matchCount === 0) return;
    setCurrentMatch((i) => (i + 1) % matchCount);
  }, [matchCount]);

  const prevMatch = useCallback(() => {
    if (matchCount === 0) return;
    setCurrentMatch((i) => (i - 1 + matchCount) % matchCount);
  }, [matchCount]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  // Focus + select the search input whenever it becomes visible, or when
  // Ctrl/Cmd+F is pressed again while already open.
  useEffect(() => {
    if (!searchOpen) return;
    const el = searchInputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, [searchOpen]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "f") {
        if (messages.length === 0) return;
        e.preventDefault();
        if (searchOpen) {
          // Already open — just refocus + select the text.
          const el = searchInputRef.current;
          if (el) {
            el.focus();
            el.select();
          }
        } else {
          openSearch();
        }
      } else if (e.key === "Escape" && searchOpen) {
        closeSearch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSearch, closeSearch, searchOpen, messages.length]);

  return (
    <main className="flex-1 flex flex-col h-full min-w-0 bg-background">
      <header className="h-14 border-b border-border flex items-center justify-between gap-3 px-5 shrink-0 bg-surface/50 backdrop-blur">
        <AnimatePresence mode="wait" initial={false}>
          {searchOpen ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="flex-1 flex items-center gap-2"
            >
              <div className="relative flex-1 max-w-md">
                <Search className="size-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (e.shiftKey) prevMatch();
                      else nextMatch();
                    }
                  }}
                  placeholder="Search in this chat…"
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-surface-2 border border-border focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              {searchQuery.trim() && (
                <span className="text-xs text-muted shrink-0 tabular-nums">
                  {matchCount === 0
                    ? "no matches"
                    : `${currentMatch + 1} / ${matchCount}`}
                </span>
              )}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={prevMatch}
                  disabled={matchCount === 0}
                  className="p-1.5 rounded-md hover:bg-surface-2 text-muted disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Previous match"
                  title="Previous match (Shift+Enter)"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  onClick={nextMatch}
                  disabled={matchCount === 0}
                  className="p-1.5 rounded-md hover:bg-surface-2 text-muted disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Next match"
                  title="Next match (Enter)"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
              <button
                onClick={closeSearch}
                className="p-1.5 rounded-md hover:bg-surface-2 text-muted shrink-0"
                aria-label="Close search"
              >
                <XIcon className="size-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="text-sm font-medium text-muted"
            >
              {messages.length === 0 && !streamingText
                ? "New conversation"
                : `${messages.filter((m) => m.role !== "system").length} messages`}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2 shrink-0">
          {!searchOpen && messages.length > 0 && (
            <button
              onClick={openSearch}
              className="p-1.5 rounded-md hover:bg-surface-2 text-muted"
              aria-label="Search in chat"
              title="Search in chat (Ctrl/Cmd+F)"
            >
              <Search className="size-4" />
            </button>
          )}
          <ModelPicker model={model} setModel={setModel} models={models} disabled={isStreaming} />
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-8">
          {messages.length === 0 && !streamingText && !error ? (
            <EmptyState onPick={(s) => setInput(s)} />
          ) : (
            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    id={m.id}
                    role={m.role}
                    content={m.content}
                    canEdit={m.role === "user" && !isStreaming}
                    onEdit={(newContent) => onEditMessage(m.id, newContent)}
                    user={currentUser}
                    highlight={searchQuery.trim()}
                  />
                ))}
              </AnimatePresence>
              {isStreaming && (
                <MessageBubble
                  role="assistant"
                  content={streamingText}
                  streaming
                  user={currentUser}
                />
              )}
              {error && <ErrorBanner message={error} />}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-4 shrink-0 bg-surface/30 backdrop-blur">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-surface px-3 py-2 shadow-sm focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20 transition">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-1.5 pb-2 border-b border-border mb-2">
                <AnimatePresence>
                  {attachments.map((a) => (
                    <AttachmentChip
                      key={a.id}
                      attachment={a}
                      onRemove={() => onRemoveAttachment(a.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                className="shrink-0 size-9 rounded-xl text-muted hover:text-foreground hover:bg-surface-2 flex items-center justify-center disabled:opacity-50 transition-colors"
                aria-label="Attach files"
                title="Attach files (images / text)"
              >
                <Paperclip className="size-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,text/*,.md,.json,.csv,.log,.yml,.yaml"
                hidden
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                placeholder="Send a message… (paste images or click 📎 to attach)"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm focus:outline-none py-1.5 max-h-48"
              />
              {isStreaming ? (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onCancel}
                  className="shrink-0 size-9 rounded-xl bg-red-500 text-white text-sm font-medium flex items-center justify-center hover:bg-red-600 transition-colors"
                  aria-label="Cancel"
                >
                  <Square className="size-3.5" fill="currentColor" />
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onSend}
                  disabled={!canSend}
                  className="shrink-0 size-9 rounded-xl bg-accent text-accent-foreground text-sm font-medium flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  aria-label="Send"
                >
                  <Send className="size-4" />
                </motion.button>
              )}
            </div>
          </div>
          <div className="text-[10px] text-muted text-center mt-2">
            Press <kbd className="px-1 py-0.5 rounded bg-surface-2 border border-border">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-surface-2 border border-border">Shift+Enter</kbd> for newline · paste screenshots to attach
          </div>
        </div>
      </div>
    </main>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm"
    >
      <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
      <div className="text-red-500 break-words text-xs leading-relaxed">{message}</div>
    </motion.div>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center pt-16 pb-8"
    >
      <div className="inline-flex size-12 rounded-2xl bg-accent/10 items-center justify-center ring-1 ring-accent/20 mb-4">
        <Sparkles className="size-6 text-accent" />
      </div>
      <h2 className="text-xl font-semibold mb-1">How can I help today?</h2>
      <p className="text-sm text-muted mb-8">
        Every message is streamed in real time and logged to{" "}
        <code className="text-xs px-1 py-0.5 rounded bg-surface-2">/admin</code>.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i + 0.1 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onPick(s)}
            className="text-left text-sm px-3 py-3 rounded-xl border border-border bg-surface hover:bg-surface-2 transition-colors"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function ModelPicker({
  model,
  setModel,
  models,
  disabled,
}: {
  model: string;
  setModel: (v: string) => void;
  models: ModelOption[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = models.find((m) => m.id === model);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 disabled:opacity-50 transition-colors"
      >
        <span className="font-medium">{current?.label ?? model}</span>
        {current?.free && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            FREE
          </span>
        )}
        <ChevronDown
          className={cn("size-3.5 text-muted transition-transform", open && "rotate-180")}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-1.5 w-64 rounded-xl border border-border bg-surface shadow-xl overflow-hidden z-50 py-1"
          >
            {models.map((m) => {
              const selected = m.id === model;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setModel(m.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors",
                    selected
                      ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                      : "hover:bg-surface-2",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "font-medium truncate",
                          selected && "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {m.label}
                      </span>
                      {m.supportsImages && (
                        <ImageIcon
                          className="size-3 text-muted shrink-0"
                          aria-label="Supports images"
                        />
                      )}
                    </div>
                    <div className="text-[10px] text-muted flex items-center gap-1.5">
                      <span>{m.provider}</span>
                      {m.free && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          FREE
                        </span>
                      )}
                    </div>
                  </div>
                  {selected && (
                    <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
