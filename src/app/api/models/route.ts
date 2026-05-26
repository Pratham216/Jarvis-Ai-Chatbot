import { NextResponse } from "next/server";
import { fetchModels } from "@/lib/llm/models";

export const runtime = "nodejs";

export async function GET() {
  const models = await fetchModels();
  return NextResponse.json({ models });
}
