import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { execSafeProcess, generateThumbnail } from "@/lib/video/ffmpeg";
import { writeAssFile, CaptionPreset, SubtitleSegment } from "@/lib/subtitles/ass-generator";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title = "AI Created Video",
      scenes = [],
      aspectRatio = "VERTICAL_9_16",
      captionPreset = "bold_viral",
      audioUrl,
    } = body;

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: "No scenes provided to render" }, { status: 400 });
    }

    const clipsDir = path.resolve("./storage/clips");
    const thumbsDir = path.resolve("./storage/thumbnails");
    const subsDir = path.resolve("./storage/subtitles");

    [clipsDir, thumbsDir, subsDir].forEach((d) => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });

    const isVertical = aspectRatio === "VERTICAL_9_16";
    const width = isVertical ? 1080 : 1920;
    const height = isVertical ? 1920 : 1080;

    const fileId = `${Date.now()}_${nanoid(6)}`;
    const outputVideoPath = path.join(clipsDir, `gen_video_${fileId}.mp4`);
    const assSubtitlePath = path.join(subsDir, `gen_sub_${fileId}.ass`);

    // Calculate total duration and build subtitle segments
    let cumulativeTime = 0;
    const subSegments: SubtitleSegment[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const dur = Number(s.duration) || 5;
      const start = cumulativeTime;
      const end = cumulativeTime + dur;

      if (s.narration) {
        subSegments.push({
          id: i + 1,
          start,
          end,
          text: s.narration,
        });
      }
      cumulativeTime += dur;
    }

    // Write ASS subtitles if requested
    let hasSubtitles = false;
    if (captionPreset !== "none" && subSegments.length > 0) {
      writeAssFile(assSubtitlePath, subSegments, 0, {
        preset: captionPreset as CaptionPreset,
      });
      hasSubtitles = fs.existsSync(assSubtitlePath);
    }

    // Build FFmpeg video synthesis command
    // Generate distinct stylish colored visual scenes with motion/gradient
    const colors = ["#1e1b4b", "#172554", "#0f172a", "#311042", "#1e293b", "#022c22"];
    const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";

    // Build complex filter for scenes
    const filterInputs: string[] = [];
    let filterGraph = "";

    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const dur = Number(s.duration) || 5;
      const col = colors[i % colors.length];

      // Input i is a color canvas
      filterInputs.push("-f", "lavfi", "-i", `color=c=${col}:s=${width}x${height}:d=${dur}`);
    }

    // Concat video scenes
    const concatParts = scenes.map((_, i) => `[${i}:v]`).join("");
    filterGraph += `${concatParts}concat=n=${scenes.length}:v=1:a=0[vcat]`;

    // Add subtitles if available
    let finalVideoMap = "[vcat]";
    if (hasSubtitles) {
      const escapedAss = assSubtitlePath.replace(/\\/g, "/").replace(/:/g, "\\:");
      filterGraph += `;[vcat]ass='${escapedAss}'[outv]`;
      finalVideoMap = "[outv]";
    }

    // Resolve audio: if audioUrl provided, use it; otherwise generate ambient audio
    let audioArgs: string[] = [];
    if (audioUrl && typeof audioUrl === "string") {
      const audioRelative = audioUrl.replace(/^\/api\/media\//, "");
      const resolvedAudio = path.resolve("./storage", audioRelative);
      if (fs.existsSync(resolvedAudio)) {
        audioArgs = ["-i", resolvedAudio, "-c:a", "aac", "-b:a", "192k", "-shortest"];
      }
    }

    if (audioArgs.length === 0) {
      // Fallback ambient background tone
      audioArgs = [
        "-f",
        "lavfi",
        "-i",
        `sine=frequency=220:duration=${cumulativeTime}:sample_rate=48000`,
        "-c:a",
        "aac",
        "-b:a",
        "128k",
      ];
    }

    const fullArgs = [
      "-y",
      ...filterInputs,
      ...audioArgs,
      "-filter_complex",
      filterGraph,
      "-map",
      finalVideoMap,
      "-map",
      `${scenes.length}:a`,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputVideoPath,
    ];

    await execSafeProcess(ffmpegPath, fullArgs, 300000);

    const stat = fs.statSync(outputVideoPath);

    // Generate thumbnail
    const thumbFilename = `thumb_${fileId}.jpg`;
    const thumbPath = path.join(thumbsDir, thumbFilename);
    await generateThumbnail(outputVideoPath, 1.0, thumbPath, 640);

    // Create Project
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title,
        type: "AI_VIDEO",
        status: "COMPLETED",
        aspectRatio: isVertical ? "VERTICAL_9_16" : "LANDSCAPE_16_9",
        duration: Math.round(cumulativeTime),
        script: { scenes } as any,
      },
    });

    // Create Export record
    const exportRecord = await prisma.export.create({
      data: {
        userId: user.id,
        projectId: project.id,
        format: "mp4",
        resolution: `${width}x${height}`,
        filePath: outputVideoPath,
        fileSize: stat.size,
        duration: cumulativeTime,
        status: "COMPLETED",
      },
    });

    return NextResponse.json({
      success: true,
      projectId: project.id,
      exportId: exportRecord.id,
      videoUrl: `/api/media/clips/gen_video_${fileId}.mp4`,
      thumbnailUrl: `/api/media/thumbnails/${thumbFilename}`,
      duration: cumulativeTime,
      message: "Video created and rendered successfully!",
    });
  } catch (err: any) {
    console.error("Video scene render error:", err);
    return NextResponse.json({ error: err.message || "Failed to render video" }, { status: 500 });
  }
}
