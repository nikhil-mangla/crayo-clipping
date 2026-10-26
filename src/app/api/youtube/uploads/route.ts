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

    const uploads = await prisma.youTubeUpload.findMany({
      where: { userId: user.id },
      include: {
        channel: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            customUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ uploads });
  } catch (error: any) {
    console.error("Fetch YouTube uploads error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch uploads" },
      { status: 500 }
    );
  }
}
