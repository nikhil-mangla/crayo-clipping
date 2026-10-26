import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth/helpers";
import { editorExportProgress } from "@/lib/video/editor-service";
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

    const resolvedParams = await params;
    const exportId = resolvedParams.id;

    // Check memory state or database
    let targetFilePath: string | null = null;
    const mem = editorExportProgress.get(exportId);
    if (mem && mem.outputFilePath && fs.existsSync(mem.outputFilePath)) {
      targetFilePath = mem.outputFilePath;
    }

    if (!targetFilePath) {
      const dbExport = await prisma.export.findUnique({
        where: { id: exportId },
      });
      if (dbExport && dbExport.filePath && fs.existsSync(dbExport.filePath)) {
        targetFilePath = dbExport.filePath;
      }
    }

    if (!targetFilePath) {
      // Direct file search in storage/exports
      const direct = path.resolve("./storage/exports", `premiere_${exportId}.mp4`);
      if (fs.existsSync(direct)) {
        targetFilePath = direct;
      }
    }

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
      return NextResponse.json({ error: "Exported file not found" }, { status: 404 });
    }

    const stat = fs.statSync(targetFilePath);
    const fileName = `clipforge_premiere_${exportId}.mp4`;

    const fileStream = fs.createReadStream(targetFilePath);
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
        "Content-Type": "video/mp4",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("Editor download error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to download exported video" },
      { status: 500 }
    );
  }
}
