import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { dispatchRenderClipJob } from "@/lib/queue/dispatcher";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      candidateId,
      cropMode = "center",
      customCropXPercent = 50,
      captionPreset = "bold_viral",
      quality = "high",
      resolution = "2k",
      videoFilter = "none",
      antiClaimProtection = true,
      removeWatermark = true,
      watermarkZone = "auto",
      musicTrack = "none",
      musicVolume = 0.18,
    } = body;

    if (!candidateId) {
      return NextResponse.json({ error: "Missing candidateId" }, { status: 400 });
    }

    const candidate = await prisma.clipCandidate.findUnique({
      where: { id: candidateId },
      include: {
        job: true,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    if (candidate.job.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const projectId = candidate.job.projectId;
    if (!projectId) {
      return NextResponse.json({ error: "Project associated with candidate not found" }, { status: 400 });
    }

    // Create a new VideoGenerationJob for rendering
    const renderJob = await prisma.videoGenerationJob.create({
      data: {
        userId: user.id,
        projectId,
        type: "VIDEO_RENDER",
        status: "QUEUED",
        progress: 0,
        stage: "Queued for vertical 9:16 rendering",
        input: {
          candidateId,
          cropMode,
          customCropXPercent,
          captionPreset,
          quality,
          resolution,
          videoFilter,
          antiClaimProtection,
          removeWatermark,
          watermarkZone,
          musicTrack,
          musicVolume,
        },
      },
    });

    // Update candidate status
    await prisma.clipCandidate.update({
      where: { id: candidateId },
      data: { status: "RENDERING" },
    });

    // Dispatch render background job
    await dispatchRenderClipJob({
      renderJobId: renderJob.id,
      candidateId,
      projectId,
      userId: user.id,
      options: {
        cropMode,
        customCropXPercent,
        captionPreset,
        quality,
        resolution,
        videoFilter,
        antiClaimProtection,
        removeWatermark,
        watermarkZone,
        musicTrack,
        musicVolume,
      },
    });

    return NextResponse.json({
      success: true,
      renderJobId: renderJob.id,
      message: "Render job dispatched. Processing vertical clip with subtitles.",
    });
  } catch (err: any) {
    console.error("Render clip error:", err);
    return NextResponse.json({ error: err.message || "Failed to start render" }, { status: 500 });
  }
}
