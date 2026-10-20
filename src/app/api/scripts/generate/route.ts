import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { generateAiScript } from "@/lib/ai/llm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { topic, niche, tone, duration, language, platform } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json({ error: "Please enter a topic for the script" }, { status: 400 });
    }

    const script = await generateAiScript({
      topic: topic.trim(),
      niche,
      tone,
      duration: duration || 45,
      language: language || "en",
      platform: platform || "TIKTOK",
    });

    return NextResponse.json({ script });
  } catch (err: any) {
    console.error("Script generation error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate script" }, { status: 500 });
  }
}
