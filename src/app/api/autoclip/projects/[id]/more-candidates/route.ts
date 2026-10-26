import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { detectCandidateHighlights } from "@/lib/ai/highlight-detector";
import { generateThumbnail } from "@/lib/video/ffmpeg";
import { TranscriptSegment } from "@/lib/ai/transcription";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await req.json().catch(() => ({}));
    const count = Math.min(15, Math.max(1, Number(body.count) || 4));

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        mediaAssets: true,
        generationJobs: {
          where: { type: "AUTOCLIP" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const autoclipJob = project.generationJobs[0];
    if (!autoclipJob) {
      return NextResponse.json(
        { error: "No AutoClip analysis job found for this project" },
        { status: 400 }
      );
    }

    // Retrieve transcript
    const transcript = await prisma.transcript.findFirst({
      where: { jobId: autoclipJob.id },
    });

    if (!transcript || !transcript.segments) {
      return NextResponse.json(
        { error: "No transcript segments available to extract more clips" },
        { status: 400 }
      );
    }

    const segments = transcript.segments as unknown as TranscriptSegment[];
    const duration = project.duration || 60;

    // Fetch existing candidates
    const existingCandidates = await prisma.clipCandidate.findMany({
      where: { jobId: autoclipJob.id },
    });

    // Detect larger pool of candidates to find fresh non-overlapping viral moments
    const totalTarget = existingCandidates.length + count + 10;
    const allProposals = detectCandidateHighlights(segments, duration, {
      minDuration: 15,
      maxDuration: 60,
      targetCount: totalTarget,
    });

    // Filter out proposals that overlap with existing candidates (> 40% overlap)
    const newProposals = allProposals.filter((prop) => {
      return !existingCandidates.some((existing) => {
        const maxStart = Math.max(existing.startTime, prop.startTime);
        const minEnd = Math.min(existing.endTime, prop.endTime);
        const overlap = Math.max(0, minEnd - maxStart);
        return overlap > prop.duration * 0.4;
      });
    });

    const selectedProposals = newProposals.slice(0, count);

    if (selectedProposals.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All major viral moments across this video have already been highlighted.",
        added: 0,
      });
    }

    // Locate source video for thumbnail generation
    let sourceVideoPath = "";
    if (project.mediaAssets && project.mediaAssets.length > 0) {
      sourceVideoPath = project.mediaAssets[0].filePath;
    } else if (autoclipJob.input && typeof autoclipJob.input === "object") {
      sourceVideoPath = (autoclipJob.input as any).sourceVideoPath;
    }

    const thumbnailsDir = path.resolve("./storage/thumbnails");
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }

    const createdRecords = [];

    for (let idx = 0; idx < selectedProposals.length; idx++) {
      const prop = selectedProposals[idx];
      const thumbFilename = `thumb_${autoclipJob.id}_more_${Date.now()}_${idx}.jpg`;
      const thumbFullPath = path.join(thumbnailsDir, thumbFilename);

      if (sourceVideoPath && fs.existsSync(sourceVideoPath)) {
        try {
          const captureTime = Math.min(
            prop.startTime + 1.5,
            Math.max(0, prop.endTime - 0.5)
          );
          await generateThumbnail(sourceVideoPath, captureTime, thumbFullPath, 640);
        } catch {}
      }

      const candidateRecord = await prisma.clipCandidate.create({
        data: {
          jobId: autoclipJob.id,
          startTime: prop.startTime,
          endTime: prop.endTime,
          duration: prop.duration,
          title: prop.title,
          transcript: prop.transcriptSnippet,
          score: prop.score,
          scoreBreakdown: prop.scoreBreakdown as any,
          thumbnailPath: fs.existsSync(thumbFullPath)
            ? `/api/media/thumbnails/${thumbFilename}`
            : null,
          status: "CANDIDATE",
          metadata: {
            matchingSegments: prop.matchingSegments as any,
          },
        },
      });

      createdRecords.push(candidateRecord);
    }

    return NextResponse.json({
      success: true,
      added: createdRecords.length,
      candidates: createdRecords,
      message: `Extracted ${createdRecords.length} more viral clips!`,
    });
  } catch (err: any) {
    console.error("Failed to extract more candidates:", err);
    return NextResponse.json(
      { error: err.message || "Failed to extract more candidates" },
      { status: 500 }
    );
  }
}
