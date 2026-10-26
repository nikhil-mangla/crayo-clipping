import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { detectWatermarks } from "@/lib/video/watermark-detector";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId");

    if (!candidateId) {
      return NextResponse.json({ error: "candidateId parameter is required" }, { status: 400 });
    }

    const candidate = await prisma.clipCandidate.findUnique({
      where: { id: candidateId },
      include: {
        job: {
          include: {
            project: {
              include: {
                mediaAssets: true,
              },
            },
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const mediaAsset = candidate.job?.project?.mediaAssets?.[0];
    const sourceVideoPath = mediaAsset?.filePath || (candidate.job?.input as any)?.sourceVideoPath;

    if (!sourceVideoPath) {
      return NextResponse.json(
        {
          scan: {
            detected: false,
            watermarks: [],
            recommendation: "keep",
            explanation: "Source media file path not found for candidate",
          },
        }
      );
    }

    const scanResult = await detectWatermarks(
      sourceVideoPath,
      candidate.startTime,
      candidate.duration || candidate.endTime - candidate.startTime
    );

    return NextResponse.json({ scan: scanResult });
  } catch (error: any) {
    console.error("Watermark scan error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to scan for watermarks" },
      { status: 500 }
    );
  }
}
