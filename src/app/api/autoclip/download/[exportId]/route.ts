import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ exportId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { exportId } = await params;

    const exportRecord = await prisma.export.findUnique({
      where: { id: exportId },
      include: { project: true },
    });

    if (!exportRecord || !exportRecord.filePath) {
      return new NextResponse("Export not found", { status: 404 });
    }

    if (exportRecord.userId !== user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(exportRecord.filePath)) {
      return new NextResponse("Export file missing from storage", { status: 404 });
    }

    // Increment download count
    await prisma.export.update({
      where: { id: exportId },
      data: { downloadCount: { increment: 1 } },
    });

    const stat = fs.statSync(exportRecord.filePath);
    const sanitizedTitle = (exportRecord.project?.title || "autoclip")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const downloadFilename = `${sanitizedTitle}_vertical_9_16.mp4`;

    const fileStream = fs.createReadStream(exportRecord.filePath);
    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(readableStream as any, {
      status: 200,
      headers: {
        "Content-Length": stat.size.toString(),
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
      },
    });
  } catch (err: any) {
    console.error("Export download error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
