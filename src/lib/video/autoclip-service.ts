import path from "path";
import fs from "fs";
import { prisma } from "@/lib/db";
import {
  probeMedia,
  extractAudio,
  detectScenes,
  generateThumbnail,
  renderVerticalClip,
} from "./ffmpeg";
import { getTranscriptionProvider, TranscriptSegment } from "../ai/transcription";
import { detectCandidateHighlights } from "../ai/highlight-detector";
import { writeAssFile, CaptionPreset } from "../subtitles/ass-generator";
import { AutoClipJobPayload, RenderClipJobPayload } from "../queue/autoclip-queue";

/**
 * Updates job progress and current stage in database
 */
async function updateJobState(
  jobId: string,
  data: {
    status?: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
    progress?: number;
    stage?: string;
    error?: string;
    output?: any;
  }
) {
  try {
    await prisma.videoGenerationJob.update({
      where: { id: jobId },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.progress !== undefined && { progress: data.progress }),
        ...(data.stage !== undefined && { stage: data.stage }),
        ...(data.error !== undefined && { error: data.error }),
        ...(data.output !== undefined && { output: data.output }),
        updatedAt: new Date(),
        ...(data.status === "PROCESSING" && { startedAt: new Date() }),
        ...(data.status === "COMPLETED" && { completedAt: new Date() }),
      },
    });
  } catch (err) {
    console.error(`Failed to update job ${jobId}:`, err);
  }
}

/**
 * Executes the complete AutoClip analysis and candidate generation pipeline
 */
export async function executeAutoClipPipeline(payload: AutoClipJobPayload): Promise<void> {
  const { jobId, projectId, sourceVideoPath, options } = payload;

  try {
    await updateJobState(jobId, {
      status: "PROCESSING",
      progress: 5,
      stage: "Validating video file and probing metadata",
    });

    if (!fs.existsSync(sourceVideoPath)) {
      throw new Error(`Source video not found at ${sourceVideoPath}`);
    }

    // Step 1: Probe video properties
    const probe = await probeMedia(sourceVideoPath);
    if (probe.duration <= 0) {
      throw new Error("Unable to determine video duration. File may be corrupted.");
    }

    // Step 2: Extract audio
    await updateJobState(jobId, {
      progress: 20,
      stage: "Extracting high-fidelity audio stream",
    });

    const audioFilename = `audio_${path.basename(sourceVideoPath, path.extname(sourceVideoPath))}.wav`;
    const audioPath = path.resolve("./storage/audio", audioFilename);
    await extractAudio(sourceVideoPath, audioPath);

    // Step 3: Transcription
    await updateJobState(jobId, {
      progress: 40,
      stage: "Transcribing speech and extracting timestamps",
    });

    const provider = getTranscriptionProvider();
    const transcriptResult = await provider.transcribe(audioPath, options.language || "en");

    // Save transcript in database
    await prisma.transcript.create({
      data: {
        jobId,
        language: transcriptResult.language,
        text: transcriptResult.text,
        words: transcriptResult.words as any,
        segments: transcriptResult.segments as any,
        duration: transcriptResult.duration,
        provider: transcriptResult.provider,
      },
    });

    // Clean up temporary extracted audio file to conserve disk space
    if (fs.existsSync(audioPath)) {
      try { fs.unlinkSync(audioPath); } catch {}
    }

    // Step 4: Scene detection
    await updateJobState(jobId, {
      progress: 60,
      stage: "Detecting visual scene boundaries and camera cuts",
    });

    const sceneCuts = await detectScenes(sourceVideoPath, 0.35);

    // Step 5: Highlight detection and scoring
    await updateJobState(jobId, {
      progress: 80,
      stage: "Scoring highlights, pacing, and hook virality",
    });

    const proposals = detectCandidateHighlights(
      transcriptResult.segments,
      probe.duration,
      {
        minDuration: options.minDuration || 15,
        maxDuration: options.maxDuration || 60,
        targetCount: options.targetCount || 4,
        sceneCuts,
      }
    );

    // Step 6: Generate thumbnails and persist candidate records
    await updateJobState(jobId, {
      progress: 90,
      stage: "Generating candidate previews and thumbnails",
    });

    const thumbnailsDir = path.resolve("./storage/thumbnails");
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }

    for (let i = 0; i < proposals.length; i++) {
      const p = proposals[i];
      const thumbFilename = `thumb_${jobId}_${i}.jpg`;
      const thumbPath = path.join(thumbnailsDir, thumbFilename);

      const thumbTime = Math.min(probe.duration - 0.5, p.startTime + 1.5);
      await generateThumbnail(sourceVideoPath, thumbTime, thumbPath, 640);

      await prisma.clipCandidate.create({
        data: {
          jobId,
          title: p.title,
          startTime: p.startTime,
          endTime: p.endTime,
          duration: p.duration,
          transcript: p.transcriptSnippet,
          score: p.score,
          scoreBreakdown: p.scoreBreakdown as any,
          aspectRatio: "VERTICAL_9_16",
          status: "CANDIDATE",
          thumbnailPath: `/api/media/thumbnails/${thumbFilename}`,
          metadata: {
            matchingSegments: p.matchingSegments as any,
            probeWidth: probe.width,
            probeHeight: probe.height,
            isFallbackTranscript: transcriptResult.isFallback,
            transcriptionProvider: transcriptResult.provider,
          } as any,
        },
      });
    }

    // Update project status to READY
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "READY",
        duration: Math.round(probe.duration),
      },
    });

    // Mark job completed
    await updateJobState(jobId, {
      status: "COMPLETED",
      progress: 100,
      stage: "Completed: Candidate highlights ready for review",
      output: {
        totalDuration: probe.duration,
        candidatesCount: proposals.length,
        transcriptionProvider: transcriptResult.provider,
        isFallbackTranscript: transcriptResult.isFallback,
      },
    });
  } catch (err: any) {
    console.error(`AutoClip pipeline failed for job ${jobId}:`, err);
    await updateJobState(jobId, {
      status: "FAILED",
      error: err.message || "Failed to process video for AutoClip",
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "FAILED" },
    }).catch(() => {});

    throw err;
  }
}

/**
 * Renders a selected candidate clip into a vertical 9:16 MP4 with custom subtitles
 */
export async function executeRenderClip(payload: RenderClipJobPayload): Promise<{ exportId: string; filePath: string }> {
  const { renderJobId, candidateId, projectId, userId, options } = payload;

  try {
    await updateJobState(renderJobId, {
      status: "PROCESSING",
      progress: 10,
      stage: "Preparing clip assets and subtitle tracks",
    });

    const candidate = await prisma.clipCandidate.findUnique({
      where: { id: candidateId },
      include: {
        job: true,
      },
    });

    if (!candidate) {
      throw new Error(`Candidate clip ${candidateId} not found`);
    }

    // Retrieve source video path from project or job
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { mediaAssets: true },
    });

    let sourceVideoPath = "";
    if (project?.mediaAssets && project.mediaAssets.length > 0) {
      sourceVideoPath = project.mediaAssets[0].filePath;
    } else if (candidate.job.input && typeof candidate.job.input === "object") {
      sourceVideoPath = (candidate.job.input as any).sourceVideoPath;
    }

    if (!sourceVideoPath || !fs.existsSync(sourceVideoPath)) {
      throw new Error("Source video file could not be located on disk.");
    }

    // Update candidate status
    await prisma.clipCandidate.update({
      where: { id: candidateId },
      data: { status: "RENDERING" },
    });

    // Build Subtitle file if captions requested
    const captionPreset = options.captionPreset || "bold_viral";
    let assPath: string | undefined = undefined;

    const matchingSegments = (candidate.metadata as any)?.matchingSegments as TranscriptSegment[] || [];

    if (captionPreset !== "none" && matchingSegments.length > 0) {
      const assFilename = `sub_${candidateId}.ass`;
      const fullAssPath = path.resolve("./storage/subtitles", assFilename);
      writeAssFile(fullAssPath, matchingSegments, candidate.startTime, {
        preset: captionPreset as CaptionPreset,
      });
      assPath = fullAssPath;
    }

    await updateJobState(renderJobId, {
      progress: 35,
      stage: "Reframing video to 9:16 vertical and rendering subtitles",
    });

    const clipFilename = `clip_${candidateId}_${Date.now()}.mp4`;
    const outputVideoPath = path.resolve("./storage/clips", clipFilename);

    await renderVerticalClip({
      sourceVideoPath,
      outputVideoPath,
      startTime: candidate.startTime,
      endTime: candidate.endTime,
      cropMode: options.cropMode || "center",
      customCropXPercent: options.customCropXPercent,
      assSubtitlePath: assPath,
      targetWidth: 1080,
      targetHeight: 1920,
      quality: options.quality || "high",
    });

    await updateJobState(renderJobId, {
      progress: 85,
      stage: "Generating final clip thumbnail and finalizing metadata",
    });

    // Generate thumbnail for rendered clip
    const thumbFilename = `thumb_rendered_${candidateId}.jpg`;
    const renderedThumbPath = path.resolve("./storage/thumbnails", thumbFilename);
    await generateThumbnail(outputVideoPath, 0.5, renderedThumbPath, 640);

    const stat = fs.statSync(outputVideoPath);

    // Create Export record
    const exportRecord = await prisma.export.create({
      data: {
        userId,
        projectId,
        format: "mp4",
        resolution: "1080x1920",
        filePath: outputVideoPath,
        fileSize: stat.size,
        duration: candidate.duration,
        status: "COMPLETED",
      },
    });

    // Update candidate record
    await prisma.clipCandidate.update({
      where: { id: candidateId },
      data: {
        status: "RENDERED",
        filePath: `/api/media/clips/${clipFilename}`,
        thumbnailPath: `/api/media/thumbnails/${thumbFilename}`,
        metadata: {
          ...(candidate.metadata as any || {}),
          exportId: exportRecord.id,
          renderedCropMode: options.cropMode,
          captionPreset,
        },
      },
    });

    await updateJobState(renderJobId, {
      status: "COMPLETED",
      progress: 100,
      stage: "Rendering complete. Clip is ready for download.",
      output: {
        exportId: exportRecord.id,
        filePath: `/api/media/clips/${clipFilename}`,
        fileSize: stat.size,
      },
    });

    return { exportId: exportRecord.id, filePath: outputVideoPath };
  } catch (err: any) {
    console.error(`Render clip failed for candidate ${candidateId}:`, err);

    await prisma.clipCandidate.update({
      where: { id: candidateId },
      data: { status: "CANDIDATE" },
    }).catch(() => {});

    await updateJobState(renderJobId, {
      status: "FAILED",
      error: err.message || "Failed to render vertical clip",
    });

    throw err;
  }
}
