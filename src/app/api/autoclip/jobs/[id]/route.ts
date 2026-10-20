import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const job = await prisma.videoGenerationJob.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            mediaAssets: true,
          },
        },
        clipCandidates: {
          orderBy: { startTime: "asc" },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Format media asset stream URL if available
    let sourceMediaUrl: string | null = null;
    if (job.project?.mediaAssets && job.project.mediaAssets.length > 0) {
      const asset = job.project.mediaAssets[0];
      sourceMediaUrl = `/api/media/uploads/${asset.fileName}`;
    }

    return NextResponse.json({
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        stage: job.stage,
        error: job.error,
        output: job.output,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      },
      project: job.project
        ? {
            id: job.project.id,
            title: job.project.title,
            duration: job.project.duration,
            status: job.project.status,
            sourceMediaUrl,
          }
        : null,
      candidates: job.clipCandidates.map((c) => ({
        id: c.id,
        title: c.title,
        startTime: c.startTime,
        endTime: c.endTime,
        duration: c.duration,
        transcript: c.transcript,
        score: c.score,
        scoreBreakdown: c.scoreBreakdown,
        aspectRatio: c.aspectRatio,
        status: c.status,
        thumbnailPath: c.thumbnailPath,
        filePath: c.filePath,
        metadata: c.metadata,
      })),
    });
  } catch (err: any) {
    console.error("Fetch job error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
