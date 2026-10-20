import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { generateSrtContent } from "@/lib/subtitles/ass-generator";
import { TranscriptSegment } from "@/lib/ai/transcription";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { candidateId } = await params;

    const candidate = await prisma.clipCandidate.findUnique({
      where: { id: candidateId },
      include: { job: true },
    });

    if (!candidate) {
      return new NextResponse("Candidate not found", { status: 404 });
    }

    if (candidate.job.userId !== user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const matchingSegments =
      ((candidate.metadata as any)?.matchingSegments as TranscriptSegment[]) || [];

    const srtContent = generateSrtContent(matchingSegments, candidate.startTime);
    const filename = `${candidate.title?.replace(/[^a-zA-Z0-9_-]/g, "_") || "subtitles"}.srt`;

    return new NextResponse(srtContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Subtitle download error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
