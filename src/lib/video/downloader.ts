import fs from "fs";
import path from "path";
import { execSafeProcess } from "./ffmpeg";

const MAX_DOWNLOAD_SIZE = 500 * 1024 * 1024; // 500MB

export interface RemoteVideoMetadata {
  title: string | null;
  duration: number | null; // in seconds
}

export function isStreamingPlatformUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("vimeo.com") ||
      host.includes("tiktok.com") ||
      host.includes("twitter.com") ||
      host.includes("x.com") ||
      host.includes("instagram.com") ||
      host.includes("facebook.com") ||
      host.includes("reddit.com") ||
      host.includes("dailymotion.com")
    );
  } catch {
    return false;
  }
}

/**
 * Extract video title & duration quickly without downloading video
 */
export async function getRemoteVideoMetadata(url: string): Promise<RemoteVideoMetadata> {
  try {
    const args = [
      "-m",
      "yt_dlp",
      "--no-playlist",
      "--print",
      "%(duration)s|||%(title)s",
      url,
    ];
    const { stdout } = await execSafeProcess("python3", args, 25000);
    const lines = stdout.trim().split("\n");
    const lastLine = lines[lines.length - 1] || "";
    const parts = lastLine.split("|||");

    const durationNum = parts[0] ? parseFloat(parts[0]) : null;
    const titleStr = parts[1] ? parts[1].trim() : null;

    return {
      duration: !isNaN(durationNum as number) ? durationNum : null,
      title: titleStr && titleStr.length > 0 ? titleStr : null,
    };
  } catch (err) {
    console.warn("Failed to probe remote video metadata:", err);
    return { title: null, duration: null };
  }
}

/**
 * Legacy wrapper for title only
 */
export async function getRemoteVideoTitle(url: string): Promise<string | null> {
  const meta = await getRemoteVideoMetadata(url);
  return meta.title;
}

/**
 * Clean up all residual partial files created by yt-dlp with the given base path
 */
export function cleanupResidualFiles(basePath: string): void {
  const dir = path.dirname(basePath);
  const baseName = path.basename(basePath, path.extname(basePath));
  if (!fs.existsSync(dir)) return;

  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.startsWith(baseName) && file !== path.basename(basePath)) {
        try {
          fs.unlinkSync(path.join(dir, file));
        } catch {}
      }
    }
  } catch {}
}

/**
 * Download video stream from YouTube, Vimeo, TikTok, etc. using yt-dlp
 */
export async function downloadWithYtDlp(
  url: string,
  destinationPath: string,
  durationHint?: number | null
): Promise<void> {
  const dir = path.dirname(destinationPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Determine ffmpeg directory
  const ffmpegPath = process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";
  const ffmpegDir = fs.existsSync(ffmpegPath) ? path.dirname(ffmpegPath) : "/opt/homebrew/bin";

  // High Definition format selection:
  // - High quality 1080p/720p source keeps cropped 9:16 vertical details crisp and sharp
  // - For videos > 30 minutes, 720p delivers excellent clarity while staying ~300MB
  let formatSelector = "bestvideo[height<=1080][ext=mp4]+bestaudio/bestvideo[height<=1080]+bestaudio/bestvideo[height<=720]+bestaudio/best";
  if (durationHint && durationHint > 1800) {
    formatSelector = "bestvideo[height<=720]+bestaudio/best[height<=720]/best";
  }

  const args = [
    "-m",
    "yt_dlp",
    "--no-playlist",
    "--js-runtimes",
    "node",
    "--ffmpeg-location",
    ffmpegDir,
    "-f",
    formatSelector,
    "--max-filesize",
    "480M",
    "--merge-output-format",
    "mp4",
    "-o",
    destinationPath,
    url,
  ];

  try {
    await execSafeProcess("python3", args, 360000); // 6 min timeout

    // Check if the expected MP4 was generated
    if (!fs.existsSync(destinationPath) || fs.statSync(destinationPath).size < 1000) {
      // Check if yt-dlp saved as another extension (.mkv, .webm)
      const baseName = destinationPath.replace(/\.mp4$/, "");
      const possibleExtensions = [".webm", ".mkv", ".mp4.webm", ".mp4.mkv"];
      let foundAltPath: string | null = null;

      for (const ext of possibleExtensions) {
        const candidate = `${baseName}${ext}`;
        if (fs.existsSync(candidate) && fs.statSync(candidate).size > 1000) {
          foundAltPath = candidate;
          break;
        }
      }

      if (foundAltPath) {
        // Remux to mp4 container
        await execSafeProcess(
          ffmpegPath,
          ["-y", "-i", foundAltPath, "-c", "copy", destinationPath],
          120000
        );
        try { fs.unlinkSync(foundAltPath); } catch {}
      } else {
        throw new Error(
          `Video download completed but output file could not be finalized at ${destinationPath}. Check URL permissions.`
        );
      }
    }

    // Clean up any stray fragments
    cleanupResidualFiles(destinationPath);
  } catch (err: any) {
    // Clean up destination and all partial download fragments
    if (fs.existsSync(destinationPath)) {
      try { fs.unlinkSync(destinationPath); } catch {}
    }
    cleanupResidualFiles(destinationPath);

    const msg = err.message || "";
    if (msg.includes("max-filesize")) {
      throw new Error(
        "The video stream exceeds the platform limit of 350MB. Please use a shorter video or segment."
      );
    }
    if (msg.includes("Private video") || msg.includes("Sign in")) {
      throw new Error(
        "This video is private, restricted, or requires login. Please provide a public video URL."
      );
    }
    if (msg.includes("No supported JavaScript runtime")) {
      // yt-dlp warning, not the fatal error
      throw new Error(`Video download failed: ${msg.split("\n").filter((l: string) => !l.includes("WARNING")).join(" ")}`);
    }

    throw err;
  }
}

/**
 * Download raw direct video URL (e.g. .mp4 or .webm)
 */
export async function downloadDirectUrl(url: string, destinationPath: string): Promise<number> {
  const dir = path.dirname(destinationPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "ClipForgeAI/1.0 (VideoIngestBot)",
    },
    signal: AbortSignal.timeout(180000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch video URL: HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  // If the remote server returned HTML instead of video, throw informative error
  if (contentType.includes("text/html")) {
    throw new Error(
      "The URL returned a web page (HTML) instead of a video stream. If this is a YouTube or social media link, make sure it is a supported public video."
    );
  }

  if (!response.body) {
    throw new Error("No response body received from video URL");
  }

  const fileStream = fs.createWriteStream(destinationPath);
  let downloadedBytes = 0;

  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      downloadedBytes += value.length;
      if (downloadedBytes > MAX_DOWNLOAD_SIZE) {
        fileStream.close();
        if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath);
        throw new Error("Download exceeded 500MB size limit.");
      }
      fileStream.write(Buffer.from(value));
    }
  }
  fileStream.end();

  await new Promise((res, rej) => {
    fileStream.on("finish", () => res(null));
    fileStream.on("error", rej);
  });

  return downloadedBytes;
}
