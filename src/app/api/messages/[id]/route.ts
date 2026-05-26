import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const ParamsSchema = z.object({ id: z.string().uuid() });

/**
 * DELETE /api/messages/[id]?cascade=true
 * Deletes the target message, and when cascade=true also deletes every
 * message that came after it in the same conversation.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!ParamsSchema.safeParse({ id }).success) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const cascade = req.nextUrl.searchParams.get("cascade") === "true";

  const target = await prisma.message.findUnique({
    where: { id },
    include: { conversation: { select: { userId: true } } },
  });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (target.conversation?.userId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (cascade) {
    await prisma.message.deleteMany({
      where: {
        conversationId: target.conversationId,
        createdAt: { gte: target.createdAt },
      },
    });
  } else {
    await prisma.message.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
