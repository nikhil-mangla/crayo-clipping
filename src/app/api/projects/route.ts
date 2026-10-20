import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        exports: {
          select: { id: true, format: true, resolution: true },
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (err: any) {
    console.error("Projects API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    await prisma.project.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete project error:", err);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
