import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { probeMedia } from "@/lib/video/ffmpeg";
import { dispatchAutoClipJob } from "@/lib/queue/dispatcher";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
];

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "Untitled AutoClip Video";
    const language = (formData.get("language") as string) || "en";
    const targetCount = parseInt((formData.get("targetCount") as string) || "4", 10);
    const minDuration = parseInt((formData.get("minDuration") as string) || "15", 10);
    const maxDuration = parseInt((formData.get("maxDuration") as string) || "60", 10);

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 500MB" },
        { status: 400 }
      );
    }

    const originalName = file.name;
    const ext = path.extname(originalName).toLowerCase() || ".mp4";

    const uploadsDir = path.resolve("./storage/uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileId = `${Date.now()}_${nanoid(8)}`;
    const savedFilename = `${fileId}${ext}`;
    const destinationPath = path.join(uploadsDir, savedFilename);

    // Stream write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destinationPath, buffer);

    // Validate video via ffprobe
    let probe;
    try {
      probe = await probeMedia(destinationPath);
    } catch (err: any) {
      if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath);
      return NextResponse.json(
        { error: `Invalid or unreadable video file: ${err.message}` },
        { status: 400 }
      );
    }

    if (!probe.hasAudio) {
      if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath);
      return NextResponse.json(
        { error: "Video has no audio track. AutoClip requires speech audio to identify highlights." },
        { status: 400 }
      );
    }

    // Create Project
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title,
        type: "AUTOCLIP",
        status: "GENERATING",
        platform: "TIKTOK",
        aspectRatio: "VERTICAL_9_16",
        duration: Math.round(probe.duration),
        language,
        settings: {
          originalFilename: originalName,
          minDuration,
          maxDuration,
          targetCount,
        },
      },
    });

    // Save MediaAsset
    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        userId: user.id,
        projectId: project.id,
        type: "VIDEO",
        name: originalName,
        fileName: savedFilename,
        filePath: destinationPath,
        fileSize: file.size,
        mimeType: file.type || "video/mp4",
        width: probe.width,
        height: probe.height,
        duration: probe.duration,
        source: "UPLOAD",
        metadata: {
          fps: probe.fps,
          codec: probe.videoCodec,
          audioCodec: probe.audioCodec,
        },
      },
    });

    // Create VideoGenerationJob
    const job = await prisma.videoGenerationJob.create({
      data: {
        userId: user.id,
        projectId: project.id,
        type: "AUTOCLIP",
        status: "QUEUED",
        progress: 0,
        stage: "Queued for processing",
        input: {
          sourceVideoPath: destinationPath,
          mediaAssetId: mediaAsset.id,
          options: {
            minDuration,
            maxDuration,
            targetCount,
            language,
          },
        },
      },
    });

    // Dispatch background job
    await dispatchAutoClipJob({
      jobId: job.id,
      projectId: project.id,
      userId: user.id,
      sourceVideoPath: destinationPath,
      options: {
        minDuration,
        maxDuration,
        targetCount,
        language,
      },
    });

    return NextResponse.json(
      {
        success: true,
        projectId: project.id,
        jobId: job.id,
        mediaAssetId: mediaAsset.id,
        message: "Video uploaded successfully. AutoClip processing started.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("AutoClip upload error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload video" },
      { status: 500 }
    );
  }
}
