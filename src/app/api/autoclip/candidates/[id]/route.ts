import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, startTime, endTime, metadata } = body;

    const candidate = await prisma.clipCandidate.findUnique({
      where: { id },
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

    const newStart = startTime !== undefined ? Number(startTime) : candidate.startTime;
    const newEnd = endTime !== undefined ? Number(endTime) : candidate.endTime;

    if (newEnd <= newStart) {
      return NextResponse.json(
        { error: "End time must be strictly greater than start time" },
        { status: 400 }
      );
    }

    const newDuration = Number((newEnd - newStart).toFixed(2));

    const updated = await prisma.clipCandidate.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        startTime: newStart,
        endTime: newEnd,
        duration: newDuration,
        ...(metadata !== undefined && {
          metadata: {
            ...((candidate.metadata as any) || {}),
            ...metadata,
          },
        }),
      },
    });

    return NextResponse.json({ success: true, candidate: updated });
  } catch (err: any) {
    console.error("Update candidate error:", err);
    return NextResponse.json({ error: "Failed to update candidate" }, { status: 500 });
  }
}
