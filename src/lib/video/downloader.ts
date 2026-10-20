import fs from "fs";
import path from "path";
import { execSafeProcess } from "./ffmpeg";

const MAX_DOWNLOAD_SIZE = 500 * 1024 * 1024; // 500MB

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
 * Extract video title using yt-dlp metadata
 */
export async function getRemoteVideoTitle(url: string): Promise<string | null> {
  try {
    const args = ["-m", "yt_dlp", "--print", "title", "--no-playlist", url];
    const { stdout } = await execSafeProcess("python3", args, 20000);
    const title = stdout.trim();
    return title.length > 0 ? title : null;
  } catch {
    return null;
  }
}

/**
 * Download video stream from YouTube, Vimeo, TikTok, etc. using yt-dlp
 */
export async function downloadWithYtDlp(url: string, destinationPath: string): Promise<void> {
  const dir = path.dirname(destinationPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Target 720p/480p compact format to keep downloads fast and disk-safe (~15-40MB)
  const args = [
    "-m",
    "yt_dlp",
    "--no-playlist",
    "--js-runtimes",
    "node",
    "-f",
    "b[height<=720][ext=mp4]/best[height<=720]/bestvideo[height<=720]+bestaudio/best",
    "--max-filesize",
    "200M",
    "--merge-output-format",
    "mp4",
    "--no-part",
    "-o",
    destinationPath,
    url,
  ];

  try {
    await execSafeProcess("python3", args, 300000); // 5 min timeout
  } catch (err) {
    // Clean up any residual partial files on disk
    if (fs.existsSync(destinationPath)) {
      try { fs.unlinkSync(destinationPath); } catch {}
    }
    const partialYtdl = `${destinationPath}.ytdl`;
    if (fs.existsSync(partialYtdl)) {
      try { fs.unlinkSync(partialYtdl); } catch {}
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
