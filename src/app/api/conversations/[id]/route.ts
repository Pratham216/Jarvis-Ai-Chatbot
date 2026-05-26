import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const ParamsSchema = z.object({ id: z.string().uuid() });

async function assertOwns(id: string, userId: string) {
  const convo = await prisma.conversation.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!convo) return { ok: false as const, status: 404 };
  if (convo.userId !== userId) return { ok: false as const, status: 403 };
  return { ok: true as const };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!ParamsSchema.safeParse({ id }).success) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const own = await assertOwns(id, userId);
  if (!own.ok) return NextResponse.json({ error: "not found" }, { status: own.status });

  const convo = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(convo);
}

const PatchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  status: z.enum(["active", "cancelled", "archived"]).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!ParamsSchema.safeParse({ id }).success) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const own = await assertOwns(id, userId);
  if (!own.ok) return NextResponse.json({ error: "not found" }, { status: own.status });

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation failed" }, { status: 422 });
  }
  const updated = await prisma.conversation.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!ParamsSchema.safeParse({ id }).success) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const own = await assertOwns(id, userId);
  if (!own.ok) return NextResponse.json({ error: "not found" }, { status: own.status });

  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
