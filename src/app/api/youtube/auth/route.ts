import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { getYouTubeAuthUrl, isGoogleOAuthConfigured } from "@/lib/youtube/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const { searchParams } = new URL(req.url);
    const returnTo = searchParams.get("returnTo") || "/dashboard/youtube";

    if (!isGoogleOAuthConfigured()) {
      // If credentials are not in .env, redirect to settings with informational banner
      const redirectUrl = new URL(returnTo, req.url);
      redirectUrl.searchParams.set("youtube_modal", "setup_needed");
      return NextResponse.redirect(redirectUrl);
    }

    const origin = req.nextUrl.origin || "http://localhost:3000";
    const redirectUri = `${origin}/api/youtube/callback`;

    const statePayload = Buffer.from(
      JSON.stringify({
        userId: user.id,
        returnTo,
        redirectUri,
        timestamp: Date.now(),
      })
    ).toString("base64");

    const authUrl = getYouTubeAuthUrl(statePayload, redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("YouTube Auth initiation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate YouTube authentication" },
      { status: 500 }
    );
  }
}
