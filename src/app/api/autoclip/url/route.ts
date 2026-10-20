import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { probeMedia } from "@/lib/video/ffmpeg";
import { dispatchAutoClipJob } from "@/lib/queue/dispatcher";
import { isStreamingPlatformUrl, getRemoteVideoTitle, downloadWithYtDlp, downloadDirectUrl } from "@/lib/video/downloader";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

function isPrivateIpOrHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "0.0.0.0" ||
    lower === "::1" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return true;
  }

  // Check IPv4 private ranges
  const ipv4Regex = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
  const match = ipv4Regex.exec(lower);
  if (match) {
    const octet1 = parseInt(match[1], 10);
    const octet2 = parseInt(match[2], 10);

    if (octet1 === 10) return true; // 10.0.0.0/8
    if (octet1 === 127) return true; // 127.0.0.0/8
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true; // 172.16.0.0/12
    if (octet1 === 192 && octet2 === 168) return true; // 192.168.0.0/16
    if (octet1 === 169 && octet2 === 254) return true; // 169.254.0.0/16 (link-local, cloud metadata)
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { url, title, language = "en", targetCount = 4, minDuration = 15, maxDuration = 60 } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Please provide a valid video URL" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Only HTTP and HTTPS URLs are supported" }, { status: 400 });
    }

    if (isPrivateIpOrHost(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: "Access to private or local network hosts is prohibited for security." },
        { status: 403 }
      );
    }

    const uploadsDir = path.resolve("./storage/uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileId = `${Date.now()}_${nanoid(8)}`;
    const destinationPath = path.join(uploadsDir, `${fileId}.mp4`);

    let finalTitle = title && title.trim().length > 0 ? title.trim() : "Imported Video";
    let downloadedBytes = 0;

    // Platform-specific extraction (YouTube, Vimeo, TikTok, etc.)
    if (isStreamingPlatformUrl(url)) {
      if (!title || title.trim().length === 0 || title === "Imported Video" || title === "URL Imported Video") {
        const remoteTitle = await getRemoteVideoTitle(url);
        if (remoteTitle) finalTitle = remoteTitle;
      }

      try {
        await downloadWithYtDlp(url, destinationPath);
        if (fs.existsSync(destinationPath)) {
          downloadedBytes = fs.statSync(destinationPath).size;
        }
      } catch (dlErr: any) {
        return NextResponse.json(
          {
            error: `Could not extract video stream from this URL: ${dlErr.message || "Video unavailable or restricted"}. Make sure the video is public and accessible.`,
          },
          { status: 400 }
        );
      }
    } else {
      // Direct raw video file URL
      try {
        downloadedBytes = await downloadDirectUrl(url, destinationPath);
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    // Validate downloaded video via ffprobe
    let probe;
    try {
      probe = await probeMedia(destinationPath);
    } catch (err: any) {
      if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath);
      return NextResponse.json(
        { error: `The downloaded file is not a supported or valid video format: ${err.message}` },
        { status: 400 }
      );
    }

    if (!probe.hasAudio) {
      if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath);
      return NextResponse.json(
        { error: "Video contains no audio track. AutoClip requires speech audio to identify highlights." },
        { status: 400 }
      );
    }

    // Create Project
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title: finalTitle,
        type: "AUTOCLIP",
        status: "GENERATING",
        platform: "TIKTOK",
        aspectRatio: "VERTICAL_9_16",
        duration: Math.round(probe.duration),
        language,
        settings: {
          sourceUrl: url,
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
        name: finalTitle,
        fileName: `${fileId}.mp4`,
        filePath: destinationPath,
        fileSize: downloadedBytes,
        mimeType: "video/mp4",
        width: probe.width,
        height: probe.height,
        duration: probe.duration,
        source: "UPLOAD",
        metadata: {
          sourceUrl: url,
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
          sourceUrl: url,
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
        title: finalTitle,
        message: `Extracted and started processing "${finalTitle}".`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("AutoClip URL import error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process video URL" },
      { status: 500 }
    );
  }
}
