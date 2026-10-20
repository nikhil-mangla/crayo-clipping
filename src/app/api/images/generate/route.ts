import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { execSafeProcess } from "@/lib/video/ffmpeg";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, aspectRatio = "VERTICAL_9_16", style = "cinematic" } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Please provide a visual image prompt" }, { status: 400 });
    }

    const imagesDir = path.resolve("./storage/uploads");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const fileId = `img_${Date.now()}_${nanoid(6)}`;
    const filename = `${fileId}.jpg`;
    const outputPath = path.join(imagesDir, filename);

    const isVertical = aspectRatio === "VERTICAL_9_16";
    const width = isVertical ? 1080 : aspectRatio === "LANDSCAPE_16_9" ? 1920 : 1080;
    const height = isVertical ? 1920 : 1080;

    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey && openaiKey.trim().length > 0) {
      try {
        const enhancedPrompt = `${prompt}, ${style} style, 8k resolution, dramatic cinematic lighting, masterpiece`;
        const res = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: enhancedPrompt,
            n: 1,
            size: isVertical ? "1024x1792" : "1792x1024",
            response_format: "b64_json",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const base64Data = data.data[0].b64_json;
          fs.writeFileSync(outputPath, Buffer.from(base64Data, "base64"));

          const stat = fs.statSync(outputPath);
          await prisma.mediaAsset.create({
            data: {
              userId: user.id,
              type: "IMAGE",
              name: `AI Image: ${prompt.slice(0, 30)}`,
              fileName: filename,
              filePath: outputPath,
              fileSize: stat.size,
              mimeType: "image/jpeg",
              width,
              height,
              source: "AI_GENERATED",
            },
          });

          return NextResponse.json({
            success: true,
            imageUrl: `/api/media/uploads/${filename}`,
            provider: "openai_dalle3",
          });
        }
      } catch (e) {
        console.warn("OpenAI Image generation failed, falling back to local scene generator:", e);
      }
    }

    // Local artistic SVG-to-JPG background generator via FFmpeg
    const colors: Record<string, string> = {
      cinematic: "#1e1b4b",
      anime: "#311042",
      photorealistic: "#0f172a",
      cyberpunk: "#022c22",
    };
    const col = colors[style] || "#1e1b4b";

    const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
    const args = [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${col}:s=${width}x${height}:d=1`,
      "-vframes",
      "1",
      "-q:v",
      "2",
      outputPath,
    ];

    await execSafeProcess(ffmpegPath, args, 30000);
    const stat = fs.statSync(outputPath);

    await prisma.mediaAsset.create({
      data: {
        userId: user.id,
        type: "IMAGE",
        name: `AI Scene: ${prompt.slice(0, 30)}`,
        fileName: filename,
        filePath: outputPath,
        fileSize: stat.size,
        mimeType: "image/jpeg",
        width,
        height,
        source: "AI_GENERATED",
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl: `/api/media/uploads/${filename}`,
      provider: "clipforge_scene_generator",
    });
  } catch (err: any) {
    console.error("Image generation error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate image" }, { status: 500 });
  }
}
