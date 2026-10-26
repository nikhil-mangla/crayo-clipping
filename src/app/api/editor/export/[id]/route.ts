import { NextRequest, NextResponse } from "next/server";
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

    // Check in-memory progress tracker first
    const memoryState = editorExportProgress.get(exportId);
    if (memoryState) {
      return NextResponse.json(memoryState);
    }

    // Fallback: check database Export record
    const dbExport = await prisma.export.findUnique({
      where: { id: exportId },
    });

    if (dbExport) {
      const isComplete = dbExport.status === "COMPLETED";
      return NextResponse.json({
        exportId: dbExport.id,
        status: dbExport.status,
        progress: isComplete ? 100 : 50,
        message: isComplete ? "Export completed successfully" : "Processing export...",
        downloadUrl: `/api/editor/download/${dbExport.id}`,
        fileSize: dbExport.fileSize,
        duration: dbExport.duration,
      });
    }

    return NextResponse.json({ error: "Export job not found" }, { status: 404 });
  } catch (err: any) {
    console.error("Editor export status check error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to check status" },
      { status: 500 }
    );
  }
}
