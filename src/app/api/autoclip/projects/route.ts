import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: user.id,
        type: "AUTOCLIP",
      },
      orderBy: { createdAt: "desc" },
      include: {
        mediaAssets: {
          take: 1,
        },
        generationJobs: {
          where: { type: "AUTOCLIP" },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            clipCandidates: {
              select: { id: true, status: true, score: true },
            },
          },
        },
      },
    });

    const formatted = projects.map((p) => {
      const latestJob = p.generationJobs[0];
      const media = p.mediaAssets[0];
      return {
        id: p.id,
        title: p.title,
        duration: p.duration,
        status: p.status,
        createdAt: p.createdAt,
        mediaFileName: media?.fileName,
        jobId: latestJob?.id,
        jobStatus: latestJob?.status,
        jobProgress: latestJob?.progress,
        jobStage: latestJob?.stage,
        candidatesCount: latestJob?.clipCandidates.length || 0,
      };
    });

    return NextResponse.json({ projects: formatted });
  } catch (err: any) {
    console.error("List projects error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
