import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { createOAuth2Client } from "@/lib/youtube/client";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const channel = await prisma.youTubeChannel.findFirst({
      where: { id, userId: user.id },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Attempt token revocation with Google if it's a real token
    if (channel.accessToken && !channel.accessToken.startsWith("mock_")) {
      try {
        const oauth2Client = createOAuth2Client();
        await oauth2Client.revokeToken(channel.accessToken);
      } catch (revErr) {
        console.warn("Could not revoke token from Google OAuth endpoint:", revErr);
      }
    }

    // Delete channel
    await prisma.youTubeChannel.delete({
      where: { id },
    });

    // If deleted channel was default, set the latest remaining channel as default
    if (channel.isDefault) {
      const nextDefault = await prisma.youTubeChannel.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      if (nextDefault) {
        await prisma.youTubeChannel.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Channel "${channel.title}" disconnected successfully.`,
    });
  } catch (error: any) {
    console.error("Disconnect YouTube channel error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to disconnect channel" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { isDefault } = body;

    const channel = await prisma.youTubeChannel.findFirst({
      where: { id, userId: user.id },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (isDefault) {
      // Unset all other channels as default for this user
      await prisma.youTubeChannel.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });

      await prisma.youTubeChannel.update({
        where: { id },
        data: { isDefault: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Channel "${channel.title}" set as default upload destination.`,
    });
  } catch (error: any) {
    console.error("Update YouTube channel error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update channel" },
      { status: 500 }
    );
  }
}
