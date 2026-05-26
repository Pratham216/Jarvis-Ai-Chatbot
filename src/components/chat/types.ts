export interface ConversationSummary {
  id: string;
  title: string;
  status: "active" | "cancelled" | "archived";
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

export interface ChatMessageRow {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface ModelOption {
  id: string;
  label: string;
  provider: string;
  free?: boolean;
  supportsImages?: boolean;
}

export interface ChatUser {
  id: string;
  name: string;
  imageUrl: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  kind: "image" | "file";
  /** Data URL for images, text content (truncated) for text files, null for unknown binaries. */
  dataUrl?: string;
  /** Extracted/inline text for text-like files. */
  text?: string;
}
