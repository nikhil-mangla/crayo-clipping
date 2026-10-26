import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/helpers";
import { isGoogleOAuthConfigured, getGoogleClientId, getRedirectUri } from "@/lib/youtube/client";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configured = isGoogleOAuthConfigured();
    const clientId = getGoogleClientId();
    const maskedClientId = clientId
      ? `${clientId.slice(0, 12)}...${clientId.slice(-15)}`
      : "";

    return NextResponse.json({
      isConfigured: configured,
      maskedClientId,
      redirectUri: getRedirectUri(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch config" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, clientSecret } = body;

    if (!clientId || !clientId.trim()) {
      return NextResponse.json(
        { error: "Google Client ID is required (e.g. xxxxx.apps.googleusercontent.com)" },
        { status: 400 }
      );
    }

    if (!clientSecret || !clientSecret.trim()) {
      return NextResponse.json(
        { error: "Google Client Secret is required (e.g. GOCSPX-xxxxx)" },
        { status: 400 }
      );
    }

    const cleanClientId = clientId.trim();
    const cleanClientSecret = clientSecret.trim();

    // 1. Update runtime in-memory environment variables
    process.env.GOOGLE_CLIENT_ID = cleanClientId;
    process.env.GOOGLE_CLIENT_SECRET = cleanClientSecret;

    // 2. Persist to .env file
    const envPath = path.resolve(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    // Replace or append GOOGLE_CLIENT_ID
    if (/^GOOGLE_CLIENT_ID=/m.test(envContent)) {
      envContent = envContent.replace(
        /^GOOGLE_CLIENT_ID=.*$/m,
        `GOOGLE_CLIENT_ID="${cleanClientId}"`
      );
    } else {
      envContent += `\nGOOGLE_CLIENT_ID="${cleanClientId}"`;
    }

    // Replace or append GOOGLE_CLIENT_SECRET
    if (/^GOOGLE_CLIENT_SECRET=/m.test(envContent)) {
      envContent = envContent.replace(
        /^GOOGLE_CLIENT_SECRET=.*$/m,
        `GOOGLE_CLIENT_SECRET="${cleanClientSecret}"`
      );
    } else {
      envContent += `\nGOOGLE_CLIENT_SECRET="${cleanClientSecret}"`;
    }

    fs.writeFileSync(envPath, envContent.trim() + "\n", "utf-8");

    return NextResponse.json({
      success: true,
      message: "Google OAuth credentials saved and applied successfully!",
      isConfigured: true,
      redirectUri: getRedirectUri(),
    });
  } catch (error: any) {
    console.error("Save YouTube OAuth config error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save OAuth credentials" },
      { status: 500 }
    );
  }
}
