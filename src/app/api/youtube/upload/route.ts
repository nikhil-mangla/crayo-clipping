import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { uploadVideoToYouTube } from "@/lib/youtube/client";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      channelId,
      candidateId,
      exportId,
      mediaAssetId,
      videoPath: directVideoPath,
      title,
      description = "",
      privacy = "private",
      tags = [],
      scheduledAt,
    } = body;

    if (!channelId) {
      return NextResponse.json(
        { error: "Please select a connected YouTube channel." },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "A video title is required for YouTube upload (1-100 characters)." },
        { status: 400 }
      );
    }

    // Verify channel belongs to user
    const channel = await prisma.youTubeChannel.findFirst({
      where: { id: channelId, userId: user.id },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Selected channel not found or unauthorized." },
        { status: 404 }
      );
    }

    // Resolve the actual video file path on disk
    let resolvedFilePath = "";

    if (candidateId) {
      const candidate = await prisma.clipCandidate.findUnique({
        where: { id: candidateId },
      });

      if (candidate?.filePath) {
        // Candidate filePath can be URL format like /api/media/clips/clip_xxx.mp4
        const filename = path.basename(candidate.filePath);
        const diskPath = path.resolve("./storage/clips", filename);
        if (fs.existsSync(diskPath)) {
          resolvedFilePath = diskPath;
        }
      }

      const exportIdFromMeta = (candidate?.metadata as any)?.exportId;
      if (!resolvedFilePath && exportIdFromMeta) {
        const exp = await prisma.export.findUnique({
          where: { id: exportIdFromMeta },
        });
        if (exp?.filePath && fs.existsSync(exp.filePath)) {
          resolvedFilePath = exp.filePath;
        }
      }
    }

    if (!resolvedFilePath && mediaAssetId) {
      const asset = await prisma.mediaAsset.findUnique({
        where: { id: mediaAssetId },
      });
      if (asset?.filePath && fs.existsSync(asset.filePath)) {
        resolvedFilePath = asset.filePath;
      }
    }

    if (!resolvedFilePath && exportId) {
      const exp = await prisma.export.findUnique({
        where: { id: exportId },
      });
      if (exp?.filePath && fs.existsSync(exp.filePath)) {
        resolvedFilePath = exp.filePath;
      }
    }

    if (!resolvedFilePath && directVideoPath) {
      const filename = path.basename(directVideoPath);
      const possiblePaths = [
        path.resolve(directVideoPath),
        path.resolve("./storage/uploads", filename),
        path.resolve("./storage/clips", filename),
        path.resolve("./storage/exports", filename),
        path.resolve("./storage", filename),
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          resolvedFilePath = p;
          break;
        }
      }
    }

    if (!resolvedFilePath || !fs.existsSync(resolvedFilePath)) {
      return NextResponse.json(
        {
          error:
            "Video file could not be found on server storage. Please render the clip first before uploading.",
        },
        { status: 400 }
      );
    }

    // Process tags
    let processedTags: string[] = [];
    if (Array.isArray(tags)) {
      processedTags = tags.map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
    } else if (typeof tags === "string") {
      processedTags = tags
        .split(/[,#\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // Execute upload to YouTube Data API v3
    const result = await uploadVideoToYouTube({
      channelId,
      userId: user.id,
      videoFilePath: resolvedFilePath,
      title: title.trim(),
      description: description.trim(),
      privacy: privacy as any,
      tags: processedTags,
      scheduledAt,
      candidateId,
      exportId,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully published "${result.title}" to ${channel.title}!`,
      upload: result,
      channel: {
        title: channel.title,
        thumbnailUrl: channel.thumbnailUrl,
      },
    });
  } catch (error: any) {
    console.error("YouTube upload API route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to publish video to YouTube" },
      { status: 500 }
    );
  }
}
