"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Pencil, X, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { ChatUser } from "./types";

interface Props {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
  canEdit?: boolean;
  onEdit?: (newContent: string) => void;
  user?: ChatUser | null;
  /** When set, wraps occurrences of this term in <mark> for in-chat search. */
  highlight?: string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, term: string): React.ReactNode {
  if (!term) return text;
  const re = new RegExp(`(${escapeRegex(term)})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark
        key={i}
        className="bg-yellow-300/60 dark:bg-yellow-500/40 text-foreground rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

function highlightChildren(children: React.ReactNode, term: string): React.ReactNode {
  if (!term) return children;
  return React.Children.map(children, (child) => {
    if (typeof child === "string") return highlightText(child, term);
    if (typeof child === "number") return child;
    if (React.isValidElement(child)) {
      const props = child.props as { children?: React.ReactNode };
      if (props.children != null) {
        return React.cloneElement(
          child as React.ReactElement<{ children?: React.ReactNode }>,
          { children: highlightChildren(props.children, term) },
        );
      }
    }
    return child;
  });
}

export default function MessageBubble({
  role,
  content,
  streaming,
  canEdit,
  onEdit,
  user,
  highlight,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const isUser = role === "user";
  const term = (highlight ?? "").trim();

  const markdownComponents = useMemo(
    () => buildMarkdownComponents(term),
    [term],
  );

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.selectionStart = taRef.current.value.length;
      taRef.current.style.height = "auto";
      taRef.current.style.height = taRef.current.scrollHeight + "px";
    }
  }, [editing]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard", { duration: 1500 });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const startEdit = () => {
    setDraft(content);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(content);
  };

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === content) {
      cancelEdit();
      return;
    }
    setEditing(false);
    onEdit?.(trimmed);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group flex gap-3 items-start",
        isUser ? "justify-end" : "justify-start w-full",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-1.5",
          isUser ? "max-w-[78%] items-end" : "w-full",
        )}
      >
        {editing ? (
          <div className="w-full min-w-[260px] rounded-2xl border border-accent/40 bg-surface p-2 shadow-sm">
            <textarea
              ref={taRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
              className="w-full resize-none bg-transparent text-sm focus:outline-none p-1.5 min-h-[44px]"
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button
                onClick={cancelEdit}
                className="px-2.5 py-1 text-xs rounded-md hover:bg-surface-2 text-muted"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-2.5 py-1 text-xs rounded-md bg-accent text-accent-foreground hover:opacity-90"
              >
                Save & regenerate
              </button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "text-sm leading-relaxed",
              isUser
                ? "bg-accent text-accent-foreground rounded-2xl rounded-tr-md px-4 py-2.5 shadow-sm whitespace-pre-wrap"
                : "text-foreground",
            )}
          >
            {content ? (
              isUser ? (
                <>
                  {term ? highlightText(content, term) : content}
                  {streaming && <StreamCursor />}
                </>
              ) : (
                <div className="prose-chat">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {content}
                  </ReactMarkdown>
                  {streaming && <StreamCursor />}
                </div>
              )
            ) : streaming ? (
              <TypingDots />
            ) : null}
          </div>
        )}

        {!editing && !streaming && content && (
          <div
            className={cn(
              "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
              isUser && "flex-row-reverse",
            )}
          >
            <ActionButton onClick={copy} title={copied ? "Copied!" : "Copy"}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </ActionButton>
            {canEdit && (
              <ActionButton onClick={startEdit} title="Edit">
                <Pencil className="size-3.5" />
              </ActionButton>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="size-8 rounded-full overflow-hidden shrink-0 ring-1 ring-border bg-surface-2 flex items-center justify-center">
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.imageUrl}
              alt={user.name}
              className="size-full object-cover"
            />
          ) : (
            <UserIcon className="size-4 text-muted" />
          )}
        </div>
      )}
    </motion.div>
  );
}

function ActionButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
    >
      {children}
    </button>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-1.5 rounded-full bg-muted"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.18,
          }}
        />
      ))}
    </span>
  );
}

function StreamCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0.2, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      className="inline-block w-[2px] h-[1em] ml-0.5 bg-current rounded-sm align-text-bottom"
    />
  );
}

function buildMarkdownComponents(term: string) {
  const wrap = (children: React.ReactNode) =>
    term ? highlightChildren(children, term) : children;
  return {
    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1 className="text-base font-semibold mt-3 mb-2 first:mt-0" {...props}>
        {wrap(children)}
      </h1>
    ),
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className="text-[15px] font-semibold mt-3 mb-1.5 first:mt-0" {...props}>
        {wrap(children)}
      </h2>
    ),
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className="text-sm font-semibold mt-2.5 mb-1 first:mt-0" {...props}>
        {wrap(children)}
      </h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className="my-1.5 first:mt-0 last:mb-0" {...props}>
        {wrap(children)}
      </p>
    ),
    ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="list-disc ml-5 my-1.5 space-y-0.5" {...props} />
    ),
    ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
      <ol className="list-decimal ml-5 my-1.5 space-y-0.5" {...props} />
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li className="leading-relaxed" {...props}>
        {wrap(children)}
      </li>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="font-semibold" {...props}>
        {wrap(children)}
      </strong>
    ),
    em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <em className="italic" {...props}>
        {wrap(children)}
      </em>
    ),
    a: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a
        className="text-accent underline underline-offset-2 hover:opacity-80"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {wrap(children)}
      </a>
    ),
    code: ({
      inline,
      className,
      children,
      ...props
    }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) => {
      if (inline) {
        return (
          <code
            className="px-1 py-0.5 rounded text-[0.85em] bg-surface-2 font-mono"
            {...props}
          >
            {wrap(children)}
          </code>
        );
      }
      return (
        <code className={cn("font-mono text-[0.85em]", className)} {...props}>
          {children}
        </code>
      );
    },
    pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
      <pre
        className="my-2 p-3 rounded-lg bg-surface-2 border border-border overflow-x-auto text-xs leading-relaxed"
        {...props}
      />
    ),
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote
        className="my-2 pl-3 border-l-2 border-border text-muted italic"
        {...props}
      >
        {wrap(children)}
      </blockquote>
    ),
    hr: () => <hr className="my-3 border-border" />,
    table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
      <div className="my-2 overflow-x-auto">
        <table className="text-xs border-collapse" {...props} />
      </div>
    ),
    th: ({ children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
      <th
        className="border border-border px-2 py-1 bg-surface-2 font-medium text-left"
        {...props}
      >
        {wrap(children)}
      </th>
    ),
    td: ({ children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
      <td className="border border-border px-2 py-1" {...props}>
        {wrap(children)}
      </td>
    ),
  };
}

export { X };
