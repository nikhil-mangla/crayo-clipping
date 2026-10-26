import { google } from "googleapis";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

export function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || "";
}

export function getGoogleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || "";
}

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/api/youtube/callback`;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(getGoogleClientId() && getGoogleClientSecret());
}

/**
 * Returns a configured Google OAuth2 client
 */
export function createOAuth2Client(redirectUri?: string) {
  const uri = redirectUri || getRedirectUri();
  return new google.auth.OAuth2(getGoogleClientId(), getGoogleClientSecret(), uri);
}

/**
 * Generates the Google OAuth authorization URL
 */
export function getYouTubeAuthUrl(state?: string, redirectUri?: string): string {
  if (!isGoogleOAuthConfigured()) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured in environment variables to connect YouTube."
    );
  }

  const oauth2Client = createOAuth2Client(redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: YOUTUBE_SCOPES,
    include_granted_scopes: true,
    prompt: "consent", // Ensures refresh_token is returned
    state: state || "",
  });
}

/**
 * Exchanges authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string, redirectUri?: string) {
  const oauth2Client = createOAuth2Client(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Returns an authenticated YouTube Data API client for a given channel,
 * automatically refreshing the access token if expired.
 */
export async function getAuthenticatedYouTubeClient(channelId: string, userId: string) {
  const channel = await prisma.youTubeChannel.findFirst({
    where: {
      id: channelId,
      userId,
    },
  });

  if (!channel) {
    throw new Error("Connected YouTube channel not found or unauthorized.");
  }

  // Handle mock/demo channels for local testing
  if (channel.channelId.startsWith("DEMO_") || channel.accessToken.startsWith("mock_")) {
    return {
      isDemo: true,
      channel,
      youtube: null,
    };
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: channel.accessToken,
    refresh_token: channel.refreshToken || undefined,
  });

  // Check if token needs refresh (if within 5 minutes of expiration)
  const isExpired =
    channel.tokenExpiresAt && channel.tokenExpiresAt.getTime() <= Date.now() + 5 * 60 * 1000;

  if (isExpired && channel.refreshToken) {
    try {
      const refreshed = await oauth2Client.refreshAccessToken();
      const newTokens = refreshed.credentials;

      const newExpiresAt = newTokens.expiry_date
        ? new Date(newTokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      await prisma.youTubeChannel.update({
        where: { id: channel.id },
        data: {
          accessToken: newTokens.access_token || channel.accessToken,
          ...(newTokens.refresh_token ? { refreshToken: newTokens.refresh_token } : {}),
          tokenExpiresAt: newExpiresAt,
          status: "ACTIVE",
        },
      });

      oauth2Client.setCredentials(newTokens);
    } catch (err: any) {
      console.error(`Failed to refresh token for channel ${channel.title}:`, err);
      await prisma.youTubeChannel.update({
        where: { id: channel.id },
        data: { status: "EXPIRED" },
      });
      throw new Error("YouTube authorization expired. Please reconnect your channel.");
    }
  }

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  return {
    isDemo: false,
    channel,
    youtube,
    oauth2Client,
  };
}

export interface YouTubeChannelProfile {
  channelId: string;
  title: string;
  description: string;
  customUrl: string;
  thumbnailUrl: string;
  subscriberCount: string;
  videoCount: number;
  viewCount: string;
}

/**
 * Fetches the authenticated user's YouTube channel profile details
 */
export async function fetchYouTubeChannelProfile(
  tokens: any
): Promise<YouTubeChannelProfile> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  const res = await youtube.channels.list({
    part: ["snippet", "statistics"],
    mine: true,
  });

  const item = res.data.items?.[0];
  if (!item) {
    throw new Error("No YouTube channel found for this Google account.");
  }

  const rawSubscribers = item.statistics?.subscriberCount;
  let formattedSubs = "0";
  if (rawSubscribers) {
    const num = parseInt(rawSubscribers, 10);
    if (num >= 1000000) {
      formattedSubs = `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      formattedSubs = `${(num / 1000).toFixed(1)}K`;
    } else {
      formattedSubs = num.toString();
    }
  }

  return {
    channelId: item.id || "",
    title: item.snippet?.title || "My YouTube Channel",
    description: item.snippet?.description || "",
    customUrl: item.snippet?.customUrl || "",
    thumbnailUrl:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      "",
    subscriberCount: formattedSubs,
    videoCount: parseInt(item.statistics?.videoCount || "0", 10),
    viewCount: item.statistics?.viewCount || "0",
  };
}

export interface PublishVideoOptions {
  channelId: string;
  userId: string;
  videoFilePath: string;
  title: string;
  description: string;
  privacy?: "public" | "unlisted" | "private";
  tags?: string[];
  scheduledAt?: string | Date;
  candidateId?: string;
  exportId?: string;
  onProgress?: (percent: number) => void;
}

export interface PublishVideoResult {
  uploadId: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  studioUrl: string;
  title: string;
  privacy: string;
}

/**
 * Uploads a video file to YouTube via YouTube Data API v3 Videos: insert with resumable upload
 */
export async function uploadVideoToYouTube(
  options: PublishVideoOptions
): Promise<PublishVideoResult> {
  const {
    channelId,
    userId,
    videoFilePath,
    title,
    description,
    privacy = "private",
    tags = [],
    scheduledAt,
    candidateId,
    exportId,
  } = options;

  if (!fs.existsSync(videoFilePath)) {
    throw new Error(`Video file not found at ${videoFilePath}`);
  }

  const stat = fs.statSync(videoFilePath);

  // Create upload tracking record in database
  const uploadRecord = await prisma.youTubeUpload.create({
    data: {
      userId,
      channelId,
      candidateId,
      exportId,
      videoPath: videoFilePath,
      title: title.slice(0, 100),
      description: description.slice(0, 5000),
      privacy,
      tags,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: "UPLOADING",
      progress: 10,
      fileSize: stat.size,
    },
  });

  try {
    const authResult = await getAuthenticatedYouTubeClient(channelId, userId);

    // DEMO / SIMULATION MODE (if running in dev without live credentials)
    if (authResult.isDemo) {
      // Simulate resumable progress over 2 seconds
      for (const p of [25, 50, 75, 95]) {
        await new Promise((r) => setTimeout(r, 400));
        await prisma.youTubeUpload.update({
          where: { id: uploadRecord.id },
          data: { progress: p },
        });
      }

      const mockVideoId = `yt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      const youtubeUrl = `https://youtu.be/${mockVideoId}`;
      const studioUrl = `https://studio.youtube.com/video/${mockVideoId}/edit`;

      await prisma.youTubeUpload.update({
        where: { id: uploadRecord.id },
        data: {
          status: "COMPLETED",
          progress: 100,
          youtubeVideoId: mockVideoId,
          youtubeUrl,
          studioUrl,
        },
      });

      return {
        uploadId: uploadRecord.id,
        youtubeVideoId: mockVideoId,
        youtubeUrl,
        studioUrl,
        title,
        privacy,
      };
    }

    const { youtube } = authResult;
    if (!youtube) {
      throw new Error("YouTube client initialization failed.");
    }

    // Determine status payload
    const statusPayload: any = {
      privacyStatus: scheduledAt ? "private" : privacy,
      selfDeclaredMadeForKids: false,
    };

    if (scheduledAt) {
      statusPayload.publishAt = new Date(scheduledAt).toISOString();
    }

    await prisma.youTubeUpload.update({
      where: { id: uploadRecord.id },
      data: { progress: 30 },
    });

    // Create stream for resumable chunked upload
    const mediaStream = fs.createReadStream(videoFilePath);

    const res = await youtube.videos.insert(
      {
        part: ["snippet", "status"],
        notifySubscribers: privacy === "public",
        requestBody: {
          snippet: {
            title: title.slice(0, 100),
            description: description.slice(0, 5000),
            tags: tags.slice(0, 30),
            categoryId: "22", // People & Blogs (Safe default for Shorts / commentary)
            defaultLanguage: "en",
          },
          status: statusPayload,
        },
        media: {
          body: mediaStream,
        },
      },
      {
        // Resumable upload configuration
        onUploadProgress: (evt) => {
          if (evt.bytesRead && stat.size > 0) {
            const rawPct = Math.round((evt.bytesRead / stat.size) * 60) + 30; // 30% to 90%
            const pct = Math.min(95, rawPct);
            prisma.youTubeUpload
              .update({
                where: { id: uploadRecord.id },
                data: { progress: pct },
              })
              .catch(() => {});
          }
        },
      }
    );

    const videoId = res.data.id;
    if (!videoId) {
      throw new Error("YouTube API upload finished without returning a video ID.");
    }

    const youtubeUrl = `https://youtu.be/${videoId}`;
    const studioUrl = `https://studio.youtube.com/video/${videoId}/edit`;

    await prisma.youTubeUpload.update({
      where: { id: uploadRecord.id },
      data: {
        status: "COMPLETED",
        progress: 100,
        youtubeVideoId: videoId,
        youtubeUrl,
        studioUrl,
      },
    });

    return {
      uploadId: uploadRecord.id,
      youtubeVideoId: videoId,
      youtubeUrl,
      studioUrl,
      title,
      privacy,
    };
  } catch (error: any) {
    console.error(`YouTube upload failed for candidate ${candidateId}:`, error);

    let friendlyError = error.message || "Failed to upload video to YouTube";
    if (error.code === 403 || error.message?.includes("quotaExceeded")) {
      friendlyError =
        "YouTube API daily upload quota exceeded for your project. Please try again tomorrow or request a quota increase in Google Cloud Console.";
    } else if (error.code === 401 || error.message?.includes("invalid_grant")) {
      friendlyError = "YouTube channel authorization expired. Please disconnect and reconnect your channel.";
    }

    await prisma.youTubeUpload.update({
      where: { id: uploadRecord.id },
      data: {
        status: "FAILED",
        error: friendlyError,
      },
    }).catch(() => {});

    throw new Error(friendlyError);
  }
}
