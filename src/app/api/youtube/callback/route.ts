import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeCodeForTokens, fetchYouTubeChannelProfile } from "@/lib/youtube/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateRaw = searchParams.get("state");

  let returnTo = "/dashboard/youtube";
  let targetUserId = "";
  let usedRedirectUri = `${req.nextUrl.origin}/api/youtube/callback`;

  if (stateRaw) {
    try {
      const stateObj = JSON.parse(Buffer.from(stateRaw, "base64").toString("utf-8"));
      returnTo = stateObj.returnTo || "/dashboard/youtube";
      targetUserId = stateObj.userId || "";
      if (stateObj.redirectUri) {
        usedRedirectUri = stateObj.redirectUri;
      }
    } catch {}
  }

  const redirectBase = new URL(returnTo, req.url);

  if (error) {
    redirectBase.searchParams.set("youtube_error", `Google Auth: ${error}`);
    return NextResponse.redirect(redirectBase);
  }

  if (!code) {
    redirectBase.searchParams.set("youtube_error", "Missing OAuth authorization code");
    return NextResponse.redirect(redirectBase);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, usedRedirectUri);
    const profile = await fetchYouTubeChannelProfile(tokens);

    if (!targetUserId) {
      redirectBase.searchParams.set("youtube_error", "User session context lost. Please log in again.");
      return NextResponse.redirect(redirectBase);
    }

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Check if user already has any connected channels (to determine if default)
    const existingChannelsCount = await prisma.youTubeChannel.count({
      where: { userId: targetUserId },
    });

    // Upsert channel connection
    await prisma.youTubeChannel.upsert({
      where: {
        userId_channelId: {
          userId: targetUserId,
          channelId: profile.channelId,
        },
      },
      update: {
        title: profile.title,
        description: profile.description,
        customUrl: profile.customUrl,
        thumbnailUrl: profile.thumbnailUrl,
        subscriberCount: profile.subscriberCount,
        videoCount: profile.videoCount,
        viewCount: profile.viewCount,
        accessToken: tokens.access_token || "",
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        tokenExpiresAt: expiresAt,
        scope: tokens.scope || "",
        status: "ACTIVE",
      },
      create: {
        userId: targetUserId,
        channelId: profile.channelId,
        title: profile.title,
        description: profile.description,
        customUrl: profile.customUrl,
        thumbnailUrl: profile.thumbnailUrl,
        subscriberCount: profile.subscriberCount,
        videoCount: profile.videoCount,
        viewCount: profile.viewCount,
        accessToken: tokens.access_token || "",
        refreshToken: tokens.refresh_token || "",
        tokenExpiresAt: expiresAt,
        scope: tokens.scope || "",
        isDefault: existingChannelsCount === 0, // First channel is default
        status: "ACTIVE",
      },
    });

    redirectBase.searchParams.set("youtube_connected", "true");
    redirectBase.searchParams.set("channel_name", profile.title);
    return NextResponse.redirect(redirectBase);
  } catch (err: any) {
    console.error("YouTube OAuth callback error:", err);
    redirectBase.searchParams.set("youtube_error", err.message || "Failed to complete YouTube channel connection");
    return NextResponse.redirect(redirectBase);
  }
}
