import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { auditClipMonetization } from "@/lib/video/copyright-checker";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { candidateId } = await params;
    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
    }

    const auditReport = await auditClipMonetization(candidateId);
    return NextResponse.json({ audit: auditReport });
  } catch (error: any) {
    console.error("Copyright audit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to audit clip copyright and monetization" },
      { status: 500 }
    );
  }
}
