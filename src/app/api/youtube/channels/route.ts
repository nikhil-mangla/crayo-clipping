import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { isGoogleOAuthConfigured } from "@/lib/youtube/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await prisma.youTubeChannel.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        channelId: true,
        title: true,
        description: true,
        customUrl: true,
        thumbnailUrl: true,
        subscriberCount: true,
        videoCount: true,
        isDefault: true,
        status: true,
        createdAt: true,
        _count: {
          select: { uploads: true },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      channels,
      isConfigured: isGoogleOAuthConfigured(),
      count: channels.length,
    });
  } catch (error: any) {
    console.error("List YouTube channels error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch connected channels" },
      { status: 500 }
    );
  }
}

/**
 * Connect a demo or manual channel for testing/development
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      title = "ClipForge Studio Shorts",
      customUrl,
      subscriberCount = "142K",
      thumbnailUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
    } = body;

    const existingCount = await prisma.youTubeChannel.count({
      where: { userId: user.id },
    });

    const demoChannelId = `DEMO_UC${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

    const channel = await prisma.youTubeChannel.create({
      data: {
        userId: user.id,
        channelId: demoChannelId,
        title,
        description: "Official channel for viral shorts, philosophy, and high-impact micro-essays.",
        customUrl: customUrl || `@${title.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        thumbnailUrl,
        subscriberCount,
        videoCount: 28,
        viewCount: "3.4M",
        accessToken: `mock_access_${Date.now()}`,
        refreshToken: `mock_refresh_${Date.now()}`,
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days
        isDefault: existingCount === 0,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Connected "${channel.title}" successfully!`,
      channel,
    });
  } catch (error: any) {
    console.error("Create channel error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to connect channel" },
      { status: 500 }
    );
  }
}
