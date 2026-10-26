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
    const upload = await prisma.youTubeUpload.findFirst({
      where: { id, userId: user.id },
      include: {
        channel: {
          select: {
            title: true,
            thumbnailUrl: true,
            channelId: true,
          },
        },
      },
    });

    if (!upload) {
      return NextResponse.json({ error: "Upload record not found" }, { status: 404 });
    }

    return NextResponse.json({ upload });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch upload status" },
      { status: 500 }
    );
  }
}
