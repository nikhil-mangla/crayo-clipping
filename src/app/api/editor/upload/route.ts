import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { probeMedia } from "@/lib/video/ffmpeg";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v", ".flv", ".3gp", ".wmv"];
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"];
const MAX_SINGLE_FILE_SIZE = 500 * 1024 * 1024; // 500MB per file

export async function POST(req: NextRequest) {
  try {
    // 1. Resolve user (or fallback to first user in database)
    let user = await getCurrentUser();
    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      return NextResponse.json({ error: "User profile not found. Please log in." }, { status: 401 });
    }

    const formData = await req.formData();

    // Collect all uploaded files (handles both 'files' array and 'file' single)
    const fileEntries = [
      ...formData.getAll("files"),
      ...formData.getAll("file"),
    ].filter((f): f is File => f instanceof File && f.size > 0);

    const assetTypeHint = (formData.get("type") as string) || "auto"; // "video" | "voiceover" | "auto"

    if (fileEntries.length === 0) {
      return NextResponse.json({ error: "No media files received in upload request." }, { status: 400 });
    }

    const uploadsDir = path.resolve("./storage/uploads");
    const audioDir = path.resolve("./storage/audio");
    [uploadsDir, audioDir].forEach((d) => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });

    const uploadedAssets: any[] = [];
    const errors: string[] = [];

    // Process each uploaded file
    for (let i = 0; i < fileEntries.length; i++) {
      const file = fileEntries[i];
      try {
        if (file.size > MAX_SINGLE_FILE_SIZE) {
          errors.push(`${file.name}: Exceeds 500MB size limit`);
          continue;
        }

        const originalName = file.name;
        const ext = path.extname(originalName).toLowerCase() || ".mp4";

        const isAudio = AUDIO_EXTENSIONS.includes(ext) || assetTypeHint === "voiceover";
        const isVideo = VIDEO_EXTENSIONS.includes(ext) || (!isAudio && assetTypeHint !== "voiceover");

        if (!isAudio && !isVideo) {
          errors.push(`${file.name}: Unsupported file extension (${ext})`);
          continue;
        }

        const targetDir = isAudio ? audioDir : uploadsDir;
        const filePrefix = isAudio ? "vo" : "clip";
        const fileName = `${filePrefix}_${Date.now()}_${i}_${nanoid(6)}${ext}`;
        const destinationPath = path.join(targetDir, fileName);

        // Write buffer to disk
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(destinationPath, buffer);

        let duration = 5.0;
        let width: number | undefined;
        let height: number | undefined;

        if (isVideo) {
          try {
            const probe = await probeMedia(destinationPath);
            duration = Math.max(0.5, parseFloat((probe.duration || 5).toFixed(2)));
            width = probe.width;
            height = probe.height;
          } catch (pErr) {
            console.warn(`Probe fallback for ${originalName}:`, pErr);
          }
        } else {
          // Audio duration probe fallback
          try {
            const probe = await probeMedia(destinationPath);
            duration = Math.max(0.5, parseFloat((probe.duration || 6).toFixed(2)));
          } catch {
            duration = 6.0;
          }
        }

        // Save MediaAsset
        const mediaAsset = await prisma.mediaAsset.create({
          data: {
            userId: user.id,
            name: originalName,
            fileName,
            filePath: destinationPath,
            fileSize: file.size,
            mimeType: file.type || (isAudio ? "audio/mpeg" : "video/mp4"),
            type: isAudio ? "VOICEOVER" : "VIDEO",
            duration,
            width,
            height,
          },
        });

        // If audio/voiceover, create Voiceover record
        if (isAudio) {
          await prisma.voiceover.create({
            data: {
              userId: user.id,
              text: originalName.replace(/\.[^/.]+$/, ""),
              voice: "Custom Upload",
              duration,
              filePath: destinationPath,
              fileSize: file.size,
              status: "COMPLETED",
            },
          });
        }

        const mediaUrl = isAudio
          ? `/api/media/audio/${fileName}`
          : `/api/media/uploads/${fileName}`;

        uploadedAssets.push({
          id: mediaAsset.id,
          title: originalName,
          duration,
          width,
          height,
          url: mediaUrl,
          filePath: destinationPath,
          type: isAudio ? "voiceover" : "video",
          aspectRatio: width && height && width > height ? "16:9" : "9:16",
        });
      } catch (fErr: any) {
        console.error(`Error processing file ${file.name}:`, fErr);
        errors.push(`${file.name}: ${fErr.message || "Failed to process"}`);
      }
    }

    if (uploadedAssets.length === 0 && errors.length > 0) {
      return NextResponse.json({ error: `Upload failed: ${errors.join(", ")}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      uploadedCount: uploadedAssets.length,
      assets: uploadedAssets,
      // Single asset backwards compatibility
      asset: uploadedAssets[0],
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("Editor upload error:", err);
    return NextResponse.json(
      { error: err.message || "Server error while handling upload" },
      { status: 500 }
    );
  }
}
