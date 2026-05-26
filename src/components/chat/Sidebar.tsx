"use client";

import { Plus, Trash2, MessageSquare, BarChart3 } from "lucide-react";
import Logo from "@/components/Logo";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { UserButton } from "@clerk/nextjs";
import { cn, formatRelative } from "@/lib/utils";
import type { ChatUser, ConversationSummary } from "./types";

interface Props {
  items: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  loading: boolean;
  currentUser: ChatUser | null;
}

export default function Sidebar({
  items,
  activeId,
  onSelect,
  onNew,
  onDelete,
  loading,
  currentUser,
}: Props) {
  return (
    <aside className="w-72 shrink-0 border-r border-border flex flex-col h-full bg-surface">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 px-2 py-1.5 mb-3">
          <div className="size-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
            <Logo size={20} />
          </div>
          <span className="font-semibold text-sm">Jarvis AI</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 text-sm font-medium transition-opacity shadow-sm"
        >
          <Plus className="size-4" />
          New chat
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && items.length === 0 ? (
          <div className="text-xs text-muted px-3 py-2">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-muted px-3 py-4 text-center">
            No conversations yet.
            <br />
            Start a new chat above.
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {items.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "group flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors",
                    c.id === activeId
                      ? "bg-surface-2"
                      : "hover:bg-surface-2/60",
                  )}
                  onClick={() => onSelect(c.id)}
                >
                  <MessageSquare className="size-4 shrink-0 text-muted" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-foreground">{c.title}</div>
                    <div className="text-[10px] text-muted mt-0.5">
                      {c._count.messages} msg{c._count.messages === 1 ? "" : "s"} · {formatRelative(c.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-border transition-opacity"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3.5 text-muted" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="border-t border-border p-2 space-y-1">
        <Link
          href="/admin"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-surface-2 transition-colors"
        >
          <BarChart3 className="size-4 text-muted" />
          <span>Observability</span>
        </Link>
        {currentUser && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface-2 transition-colors">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-7",
                },
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{currentUser.name}</div>
              <div className="text-[10px] text-muted">Signed in</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
