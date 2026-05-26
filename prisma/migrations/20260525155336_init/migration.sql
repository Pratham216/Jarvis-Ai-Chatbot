-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('active', 'cancelled', 'archived');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant', 'system');

-- CreateEnum
CREATE TYPE "InferenceStatus" AS ENUM ('success', 'error', 'cancelled');

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New conversation',
    "user_id" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "redacted_content" TEXT,
    "token_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inference_logs" (
    "id" UUID NOT NULL,
    "request_id" TEXT NOT NULL,
    "conversation_id" UUID,
    "message_id" UUID,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "InferenceStatus" NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "ttft_ms" INTEGER,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "input_preview" TEXT,
    "output_preview" TEXT,
    "error_message" TEXT,
    "metadata" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inference_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_user_id_updated_at_idx" ON "conversations"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "conversations_status_updated_at_idx" ON "conversations"("status", "updated_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inference_logs_request_id_key" ON "inference_logs"("request_id");

-- CreateIndex
CREATE INDEX "inference_logs_conversation_id_created_at_idx" ON "inference_logs"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "inference_logs_provider_model_created_at_idx" ON "inference_logs"("provider", "model", "created_at");

-- CreateIndex
CREATE INDEX "inference_logs_status_created_at_idx" ON "inference_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX "inference_logs_created_at_idx" ON "inference_logs"("created_at");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inference_logs" ADD CONSTRAINT "inference_logs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inference_logs" ADD CONSTRAINT "inference_logs_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
