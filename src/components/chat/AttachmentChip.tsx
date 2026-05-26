"use client";

import { motion } from "framer-motion";
import { X, FileText, Image as ImageIcon } from "lucide-react";
import type { Attachment } from "./types";

interface Props {
  attachment: Attachment;
  onRemove: () => void;
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentChip({ attachment, onRemove }: Props) {
  const isImage = attachment.kind === "image" && attachment.dataUrl;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="relative group"
    >
      {isImage ? (
        <div className="size-16 rounded-lg overflow-hidden border border-border bg-surface-2 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.dataUrl!}
            alt={attachment.name}
            className="size-full object-cover"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-lg border border-border bg-surface-2 max-w-[220px]">
          <div className="size-8 rounded-md bg-surface flex items-center justify-center shrink-0">
            {attachment.kind === "image" ? (
              <ImageIcon className="size-4 text-muted" />
            ) : (
              <FileText className="size-4 text-muted" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{attachment.name}</div>
            <div className="text-[10px] text-muted">{fmtSize(attachment.size)}</div>
          </div>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
        aria-label="Remove"
      >
        <X className="size-3" />
      </button>
    </motion.div>
  );
}
