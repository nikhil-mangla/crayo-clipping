import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { executeTimelineExport } from "@/lib/video/editor-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title = "Premiere Sequence",
      aspectRatio = "9:16",
      resolution = "1080p",
      clips = [],
      voiceovers = [],
      musicTrack = "none",
      musicVolume = 0.18,
      videoFilter = "none",
    } = body;

    if (!Array.isArray(clips) || clips.length === 0) {
      return NextResponse.json(
        { error: "At least 1 clip is required on the timeline sequence." },
        { status: 400 }
      );
    }

    if (clips.length > 100) {
      return NextResponse.json(
        { error: "Sequence currently supports up to 100 mini clips per export." },
        { status: 400 }
      );
    }

    // Launch timeline export pipeline
    const progressState = await executeTimelineExport({
      userId: user.id,
      title,
      aspectRatio,
      resolution,
      clips,
      voiceovers,
      musicTrack,
      musicVolume,
      videoFilter,
    });

    return NextResponse.json({
      success: true,
      exportId: progressState.exportId,
      status: progressState.status,
      message: progressState.message,
      totalClips: clips.length,
    });
  } catch (err: any) {
    console.error("Editor export error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to initialize export" },
      { status: 500 }
    );
  }
}
