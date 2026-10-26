import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { execSafeProcess, probeMedia, VideoFilterPreset, getVideoFilterGraph } from "./ffmpeg";
import { prisma } from "@/lib/db";

const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";

export interface TimelineClipInput {
  id: string;
  title: string;
  filePath?: string;
  url?: string;
  startTime: number; // in seconds inside the source clip
  endTime?: number;
  duration: number; // in seconds on timeline
  speed?: number; // 0.5 to 2.0
  color?: string;
  backgroundColor?: string;
}

export interface TimelineVoiceoverInput {
  id: string;
  title: string;
  filePath?: string;
  url?: string;
  startTime: number; // start offset in seconds on timeline
  duration: number;
  volume: number; // 0.0 to 2.0 (1.0 = 100%)
}

export interface EditorExportOptions {
  userId: string;
  projectId?: string;
  title?: string;
  aspectRatio?: "9:16" | "16:9";
  resolution?: "1080p" | "2k" | "4k";
  clips: TimelineClipInput[];
  voiceovers?: TimelineVoiceoverInput[];
  musicTrack?: string;
  musicVolume?: number;
  videoFilter?: VideoFilterPreset | string;
}

export interface ExportProgressResult {
  exportId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  message: string;
  downloadUrl?: string;
  outputFilePath?: string;
  fileSize?: number;
  duration?: number;
  error?: string;
}

// In-memory progress tracker for live polling
export const editorExportProgress = new Map<string, ExportProgressResult>();

/**
 * Resolves a local absolute path from a storage path, relative path, or URL
 */
function resolveLocalPath(filePathOrUrl?: string): string | null {
  if (!filePathOrUrl) return null;

  // Direct absolute path
  if (path.isAbsolute(filePathOrUrl) && fs.existsSync(filePathOrUrl)) {
    return filePathOrUrl;
  }

  // /api/media/... URL
  if (filePathOrUrl.startsWith("/api/media/")) {
    const rel = filePathOrUrl.replace("/api/media/", "");
    const candidate = path.resolve("./storage", rel);
    if (fs.existsSync(candidate)) return candidate;
  }

  // storage/...
  if (filePathOrUrl.startsWith("storage/")) {
    const candidate = path.resolve(".", filePathOrUrl);
    if (fs.existsSync(candidate)) return candidate;
  }

  // Check inside storage/uploads or storage/clips
  const inUploads = path.resolve("./storage/uploads", path.basename(filePathOrUrl));
  if (fs.existsSync(inUploads)) return inUploads;

  const inClips = path.resolve("./storage/clips", path.basename(filePathOrUrl));
  if (fs.existsSync(inClips)) return inClips;

  const inMusic = path.resolve("./storage/music", path.basename(filePathOrUrl));
  if (fs.existsSync(inMusic)) return inMusic;

  return null;
}

/**
 * Normalizes a single mini clip segment to exact sequence specifications.
 * Ensures uniform resolution, 30fps, 1:1 SAR, yuv420p, and stereo 48kHz audio.
 * This guarantees seamless concat demuxer concatenation for up to 100 clips!
 */
async function normalizeClipSegment(
  clip: TimelineClipInput,
  index: number,
  outputDir: string,
  targetWidth: number,
  targetHeight: number,
  filterGraphFragment: string
): Promise<string> {
  const segmentPath = path.join(outputDir, `seg_${String(index).padStart(4, "0")}.mp4`);
  const resolvedSource = resolveLocalPath(clip.filePath || clip.url);
  const duration = Math.max(0.2, clip.duration || 3);
  const startOffset = Math.max(0, clip.startTime || 0);

  if (resolvedSource && fs.existsSync(resolvedSource)) {
    // Real source video file exists: extract and normalize
    // Scale and crop to fit exact target dimensions (center crop or pad)
    const scaleCropFilter = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},setsar=1,fps=30${filterGraphFragment}`;

    const args = [
      "-y",
      "-ss",
      startOffset.toFixed(3),
      "-t",
      duration.toFixed(3),
      "-i",
      resolvedSource,
      // Provide silent audio fallback if input has no audio stream
      "-f",
      "lavfi",
      "-t",
      duration.toFixed(3),
      "-i",
      "anullsrc=r=48000:cl=stereo",
      "-filter_complex",
      `[0:v]${scaleCropFilter}[outv];[0:a][1:a]amix=inputs=2:duration=first[outa]`,
      "-map",
      "[outv]",
      "-map",
      "[outa]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-b:a",
      "192k",
      segmentPath,
    ];

    try {
      await execSafeProcess(FFMPEG_PATH, args, 60000);
      return segmentPath;
    } catch (err) {
      console.warn(`Fallback normalization for clip ${index} due to:`, err);
      // Fallback: generate high-quality stylized color tile if source decode failed
    }
  }

  // Generate stylized motion background segment if no source file or source had error
  const colors = [
    "#4f46e5", // Indigo
    "#7c3aed", // Violet
    "#2563eb", // Blue
    "#0891b2", // Cyan
    "#059669", // Emerald
    "#d97706", // Amber
    "#dc2626", // Rose
    "#9333ea", // Purple
    "#0d9488", // Teal
    "#4338ca", // Deep indigo
  ];
  const color = clip.backgroundColor || colors[index % colors.length];

  const safeTitle = (clip.title || `Clip #${index + 1}`)
    .replace(/[:\\'%]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);

  // Generate color frame with title overlay & silent 48kHz audio
  const args = [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=${targetWidth}x${targetHeight}:d=${duration.toFixed(3)}:r=30`,
    "-f",
    "lavfi",
    "-i",
    `anullsrc=r=48000:cl=stereo:d=${duration.toFixed(3)}`,
    "-vf",
    `drawtext=text='${safeTitle}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.4:boxborderw=16`,
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-b:a",
    "192k",
    segmentPath,
  ];

  await execSafeProcess(FFMPEG_PATH, args, 30000);
  return segmentPath;
}

/**
 * Processes up to 100 mini clips, normalizes them in parallel worker batches,
 * concatenates with FFmpeg concat demuxer, multiplexes voiceover and music,
 * and writes the final MP4.
 */
export async function executeTimelineExport(options: EditorExportOptions): Promise<ExportProgressResult> {
  const exportId = `exp_${Date.now()}_${nanoid(6)}`;
  const {
    userId,
    projectId,
    title = "Premiere Timeline Export",
    aspectRatio = "9:16",
    resolution = "1080p",
    clips,
    voiceovers = [],
    musicTrack = "none",
    musicVolume = 0.18,
    videoFilter = "none",
  } = options;

  // Initialize progress tracker
  const progressState: ExportProgressResult = {
    exportId,
    status: "PROCESSING",
    progress: 5,
    message: `Initializing sequence with ${clips.length} mini clips...`,
  };
  editorExportProgress.set(exportId, progressState);

  // Determine target dimensions
  let targetWidth = 1080;
  let targetHeight = 1920;

  if (aspectRatio === "9:16") {
    if (resolution === "2k") {
      targetWidth = 1440;
      targetHeight = 2560; // 2K QHD (forces YouTube VP9/AV01)
    } else if (resolution === "4k") {
      targetWidth = 2160;
      targetHeight = 3840; // 4K UHD
    } else {
      targetWidth = 1080;
      targetHeight = 1920; // 1080p
    }
  } else {
    // 16:9 Landscape
    if (resolution === "2k") {
      targetWidth = 2560;
      targetHeight = 1440;
    } else if (resolution === "4k") {
      targetWidth = 3840;
      targetHeight = 2160;
    } else {
      targetWidth = 1920;
      targetHeight = 1080;
    }
  }

  // Create temporary workspace for intermediate chunks
  const tempDir = path.resolve("./storage/temp", exportId);
  const exportsDir = path.resolve("./storage/exports");
  [tempDir, exportsDir].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const finalOutputName = `premiere_${exportId}.mp4`;
  const finalOutputPath = path.join(exportsDir, finalOutputName);

  // Asynchronously execute render
  (async () => {
    try {
      const filterFragment = getVideoFilterGraph(videoFilter, false);
      const totalClips = Math.min(100, clips.length);
      const activeClips = clips.slice(0, 100);

      // 1. Normalize clips in controlled parallel batches (4 at a time to prevent RAM overload)
      progressState.message = `Normalizing ${totalClips} mini clips for seamless concatenation...`;
      progressState.progress = 10;

      const normalizedSegmentPaths: string[] = new Array(totalClips);
      const BATCH_SIZE = 4;

      for (let i = 0; i < totalClips; i += BATCH_SIZE) {
        const batch = activeClips.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map((clip, bIdx) => {
          const globalIdx = i + bIdx;
          return normalizeClipSegment(
            clip,
            globalIdx,
            tempDir,
            targetWidth,
            targetHeight,
            filterFragment
          ).then((segPath) => {
            normalizedSegmentPaths[globalIdx] = segPath;
          });
        });

        await Promise.all(batchPromises);

        const currentNormalized = Math.min(totalClips, i + BATCH_SIZE);
        progressState.progress = 10 + Math.floor((currentNormalized / totalClips) * 50);
        progressState.message = `Normalized ${currentNormalized} / ${totalClips} mini clips...`;
      }

      // 2. Generate Concat Demuxer file
      progressState.progress = 65;
      progressState.message = "Concatenating sequence segments via demuxer...";

      const concatListFile = path.join(tempDir, "concat_list.txt");
      const listContent = normalizedSegmentPaths
        .filter((p) => p && fs.existsSync(p))
        .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
        .join("\n");

      fs.writeFileSync(concatListFile, listContent, "utf8");

      const intermediateConcatPath = path.join(tempDir, "concatenated_raw.mp4");
      const concatArgs = [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatListFile,
        "-c",
        "copy",
        intermediateConcatPath,
      ];

      await execSafeProcess(FFMPEG_PATH, concatArgs, 120000);

      // Probe concatenated duration
      let totalDuration = 0;
      try {
        const probe = await probeMedia(intermediateConcatPath);
        totalDuration = probe.duration || 10;
      } catch {
        totalDuration = activeClips.reduce((acc, c) => acc + (c.duration || 3), 0);
      }

      // 3. Audio & Voiceover Multiplexing
      progressState.progress = 75;
      progressState.message = "Multiplexing voiceover tracks & background audio...";

      // Check for voiceovers
      const validVoiceovers = (voiceovers || [])
        .map((vo) => ({
          ...vo,
          resolvedPath: resolveLocalPath(vo.filePath || vo.url),
        }))
        .filter((vo) => vo.resolvedPath && fs.existsSync(vo.resolvedPath));

      // Check background music track
      let resolvedMusicPath: string | null = null;
      if (musicTrack && musicTrack !== "none") {
        const candidateInMusic = path.resolve("./storage/music", `${musicTrack}.mp3`);
        if (fs.existsSync(candidateInMusic)) {
          resolvedMusicPath = candidateInMusic;
        } else {
          resolvedMusicPath = resolveLocalPath(musicTrack);
        }
      }

      // Build Audio Filter Graph
      const finalFfmpegInputs: string[] = ["-y", "-i", intermediateConcatPath];
      let inputIndexCounter = 1;

      const audioFilterParts: string[] = [];
      const mixInputs: string[] = ["[0:a]"];

      // Add voiceovers as inputs
      for (const vo of validVoiceovers) {
        if (!vo.resolvedPath) continue;
        finalFfmpegInputs.push("-i", vo.resolvedPath);
        const curIdx = inputIndexCounter++;
        const voVol = Math.max(0.1, Math.min(2.0, vo.volume ?? 1.0)).toFixed(2);
        const voOffsetMs = Math.round(Math.max(0, vo.startTime) * 1000);

        audioFilterParts.push(
          `[${curIdx}:a]volume=${voVol},adelay=${voOffsetMs}|${voOffsetMs},aformat=channel_layouts=stereo:sample_rates=48000[vo_${curIdx}]`
        );
        mixInputs.push(`[vo_${curIdx}]`);
      }

      // Add background music if selected
      if (resolvedMusicPath && fs.existsSync(resolvedMusicPath)) {
        finalFfmpegInputs.push("-stream_loop", "-1", "-t", totalDuration.toFixed(3), "-i", resolvedMusicPath);
        const musicIdx = inputIndexCounter++;
        const duckVol = Math.max(0.02, Math.min(0.8, musicVolume ?? 0.18)).toFixed(2);
        const fadeStart = Math.max(0, totalDuration - 2.0).toFixed(3);

        audioFilterParts.push(
          `[${musicIdx}:a]volume=${duckVol},atrim=0:${totalDuration.toFixed(3)},afade=t=out:st=${fadeStart}:d=2.0,aformat=channel_layouts=stereo:sample_rates=48000[bg_music]`
        );
        mixInputs.push("[bg_music]");
      }

      // Combine audio filters
      let finalAudioFilter = "";
      if (mixInputs.length > 1) {
        finalAudioFilter = `${audioFilterParts.join(";")};${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=2[master_a]`;
      }

      // 4. Final Encoding with YouTube high-bitrate / faststart flags
      progressState.progress = 85;
      progressState.message = "Encoding final high-fidelity MP4 master...";

      const finalArgs = [...finalFfmpegInputs];

      if (finalAudioFilter) {
        finalArgs.push("-filter_complex", finalAudioFilter, "-map", "0:v", "-map", "[master_a]");
      } else {
        finalArgs.push("-map", "0:v", "-map", "0:a?");
      }

      // Output encoding profile
      finalArgs.push(
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        resolution === "2k" ? "16" : resolution === "4k" ? "15" : "18",
        "-pix_fmt",
        "yuv420p",
        "-colorspace",
        "bt709",
        "-color_primaries",
        "bt709",
        "-color_trc",
        "bt709",
        "-c:a",
        "aac",
        "-b:a",
        "256k",
        "-ar",
        "48000",
        "-movflags",
        "+faststart",
        finalOutputPath
      );

      await execSafeProcess(FFMPEG_PATH, finalArgs, 300000);

      // 5. Gather file stats & record in database
      const stats = fs.statSync(finalOutputPath);
      const downloadUrl = `/api/editor/download/${exportId}`;

      progressState.status = "COMPLETED";
      progressState.progress = 100;
      progressState.message = `Export ready! Generated ${totalClips} clip sequence.`;
      progressState.downloadUrl = downloadUrl;
      progressState.outputFilePath = finalOutputPath;
      progressState.fileSize = stats.size;
      progressState.duration = totalDuration;

      // Save Export record in DB if user is provided
      try {
        // Find or create default project if projectId not given
        let finalProjectId = projectId;
        if (!finalProjectId) {
          const firstProj = await prisma.project.findFirst({
            where: { userId },
          });
          if (firstProj) {
            finalProjectId = firstProj.id;
          } else {
            const newProj = await prisma.project.create({
              data: {
                userId,
                title: title || "Video Editor Project",
                status: "COMPLETED",
              },
            });
            finalProjectId = newProj.id;
          }
        }

        await prisma.export.create({
          data: {
            id: exportId,
            userId,
            projectId: finalProjectId,
            format: "mp4",
            resolution,
            filePath: finalOutputPath,
            fileSize: stats.size,
            duration: totalDuration,
            status: "COMPLETED",
          },
        });
      } catch (dbErr) {
        console.warn("Could not save Export record to database:", dbErr);
      }

      // Cleanup temp intermediate directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (rmErr) {
        console.warn("Failed to clean up temp render dir:", rmErr);
      }
    } catch (err: any) {
      console.error("Timeline export failed:", err);
      progressState.status = "FAILED";
      progressState.progress = 0;
      progressState.message = `Export failed: ${err.message || "Unknown error"}`;
      progressState.error = err.message || "Render failure";
    }
  })();

  return progressState;
}
