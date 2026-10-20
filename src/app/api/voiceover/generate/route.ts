import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { synthesizeVoiceover } from "@/lib/ai/tts";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text, voice = "alloy", speed = 1.0, language = "en" } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Please enter text for voiceover" }, { status: 400 });
    }

    const audioDir = path.resolve("./storage/audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const filename = `vo_${Date.now()}_${nanoid(6)}.mp3`;
    const outputPath = path.join(audioDir, filename);

    const result = await synthesizeVoiceover({
      text: text.trim(),
      voice,
      speed: Number(speed) || 1.0,
      outputPath,
    });

    const stat = fs.statSync(outputPath);

    // Persist Voiceover record in database
    const voiceover = await prisma.voiceover.create({
      data: {
        userId: user.id,
        text: text.trim(),
        voice,
        language,
        speed: Number(speed) || 1.0,
        provider: result.provider,
        filePath: outputPath,
        fileSize: stat.size,
        duration: result.duration,
        status: "COMPLETED",
      },
    });

    // Also register in MediaAsset
    await prisma.mediaAsset.create({
      data: {
        userId: user.id,
        type: "VOICEOVER",
        name: `Voiceover: ${text.slice(0, 30)}...`,
        fileName: filename,
        filePath: outputPath,
        fileSize: stat.size,
        mimeType: "audio/mpeg",
        duration: result.duration,
        source: "AI_GENERATED",
      },
    });

    return NextResponse.json({
      success: true,
      voiceover: {
        id: voiceover.id,
        audioUrl: `/api/media/audio/${filename}`,
        duration: result.duration,
        provider: result.provider,
      },
    });
  } catch (err: any) {
    console.error("Voiceover synthesis error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate voiceover" }, { status: 500 });
  }
}
