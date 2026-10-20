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

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type");

    const assets = await prisma.mediaAsset.findMany({
      where: {
        userId: user.id,
        ...(typeFilter && typeFilter !== "ALL" ? { type: typeFilter as any } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = assets.map((a) => {
      let url = "";
      if (a.type === "IMAGE") url = `/api/media/uploads/${a.fileName}`;
      else if (a.type === "VIDEO") url = `/api/media/uploads/${a.fileName}`;
      else if (a.type === "VOICEOVER" || a.type === "AUDIO") url = `/api/media/audio/${a.fileName}`;
      else url = `/api/media/uploads/${a.fileName}`;

      return {
        id: a.id,
        name: a.name,
        type: a.type,
        fileSize: a.fileSize,
        duration: a.duration,
        width: a.width,
        height: a.height,
        createdAt: a.createdAt,
        url,
      };
    });

    return NextResponse.json({ assets: formatted });
  } catch (err: any) {
    console.error("Library fetch error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
