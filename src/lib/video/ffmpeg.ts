import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_PATH = process.env.FFPROBE_PATH || "ffprobe";

export interface MediaProbeInfo {
  duration: number; // in seconds
  width: number;
  height: number;
  aspectRatio: string;
  fps: number;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
  hasAudio: boolean;
}

/**
 * Executes a CLI process safely using spawn with argument array (no shell injection).
 */
export function execSafeProcess(
  command: string,
  args: string[],
  timeoutMs = 300000
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`Process ${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(
          `Command ${command} failed with exit code ${code}: ${stderr.slice(-1000)}`
        );
        reject(err);
      }
    });
  });
}

/**
 * Inspect video properties using ffprobe
 */
export async function probeMedia(filePath: string): Promise<MediaProbeInfo> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Media file not found at ${filePath}`);
  }

  const args = [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ];

  const { stdout } = await execSafeProcess(FFPROBE_PATH, args, 30000);
  const data = JSON.parse(stdout);

  const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === "video");
  const audioStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === "audio");

  if (!videoStream) {
    throw new Error("No video stream found in media file");
  }

  const width = parseInt(videoStream.width || "0", 10);
  const height = parseInt(videoStream.height || "0", 10);

  // Compute FPS
  let fps = 30;
  if (videoStream.avg_frame_rate && videoStream.avg_frame_rate !== "0/0") {
    const [num, den] = videoStream.avg_frame_rate.split("/").map(Number);
    if (den && den > 0) fps = Math.round(num / den);
  }

  const duration =
    parseFloat(data.format?.duration || videoStream.duration || "0") || 0;

  return {
    duration,
    width,
    height,
    aspectRatio: height > 0 ? (width / height >= 1 ? "16:9" : "9:16") : "16:9",
    fps,
    videoCodec: videoStream.codec_name,
    audioCodec: audioStream?.codec_name,
    bitrate: parseInt(data.format?.bit_rate || "0", 10),
    hasAudio: !!audioStream,
  };
}

/**
 * Extract 16kHz mono audio optimized for speech transcription
 */
export async function extractAudio(
  videoPath: string,
  outputAudioPath: string
): Promise<string> {
  const outputDir = path.dirname(outputAudioPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const args = [
    "-y",
    "-i",
    videoPath,
    "-vn",
    "-acodec",
    "pcm_s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    outputAudioPath,
  ];

  await execSafeProcess(FFMPEG_PATH, args, 120000);
  return outputAudioPath;
}

/**
 * Detect visual scene change timestamps using ffmpeg scdet or select filter
 */
export async function detectScenes(
  videoPath: string,
  threshold = 0.3
): Promise<number[]> {
  const args = [
    "-i",
    videoPath,
    "-filter_complex",
    `select='gt(scene\\,${threshold})',metadata=print:file=-`,
    "-f",
    "null",
    "-",
  ];

  try {
    const { stdout, stderr } = await execSafeProcess(FFMPEG_PATH, args, 180000);
    const combined = stdout + "\n" + stderr;
    const timestamps: number[] = [];
    const ptsRegex = /pts_time:([0-9.]+)/g;
    let match: RegExpExecArray | null;

    while ((match = ptsRegex.exec(combined)) !== null) {
      const ts = parseFloat(match[1]);
      if (!isNaN(ts) && (timestamps.length === 0 || ts - timestamps[timestamps.length - 1] > 1.0)) {
        timestamps.push(ts);
      }
    }

    return timestamps;
  } catch {
    // If scene detection fails or produces none, return empty list (safe fallback)
    return [];
  }
}

/**
 * Generate a still thumbnail image at given timestamp
 */
export async function generateThumbnail(
  videoPath: string,
  timeSec: number,
  outputImagePath: string,
  width = 640
): Promise<string> {
  const outputDir = path.dirname(outputImagePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const args = [
    "-y",
    "-ss",
    timeSec.toFixed(2),
    "-i",
    videoPath,
    "-vframes",
    "1",
    "-vf",
    `scale=${width}:-1`,
    "-q:v",
    "2",
    outputImagePath,
  ];

  await execSafeProcess(FFMPEG_PATH, args, 30000);
  return outputImagePath;
}

export interface RenderClipOptions {
  sourceVideoPath: string;
  outputVideoPath: string;
  startTime: number;
  endTime: number;
  cropMode?: "center" | "left" | "right" | "blur_background" | "custom";
  customCropXPercent?: number; // 0 to 100
  assSubtitlePath?: string;
  targetWidth?: number; // default 1080
  targetHeight?: number; // default 1920
  quality?: "fast" | "high";
  antiClaimProtection?: boolean; // Transforms video & audio fingerprints to prevent Content ID claims
}

/**
 * Renders a vertical 9:16 clip from source video with reframing and optional burned-in ASS subtitles.
 */
export async function renderVerticalClip(options: RenderClipOptions): Promise<string> {
  const {
    sourceVideoPath,
    outputVideoPath,
    startTime,
    endTime,
    cropMode = "center",
    customCropXPercent = 50,
    assSubtitlePath,
    targetWidth = 1080,
    targetHeight = 1920,
    quality = "high",
    antiClaimProtection = false,
  } = options;

  const outputDir = path.dirname(outputVideoPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const duration = Math.max(0.5, endTime - startTime);

  // High-fidelity upscaling & edge enhancement filters
  const sharpnessFilter = "flags=lanczos+accurate_rnd,unsharp=3:3:0.6:3:3:0.0";
  const colorGradeFilter = antiClaimProtection ? ",eq=contrast=1.04:brightness=0.01:saturation=1.06" : "";

  // Build filter chain
  let filterChain = "";

  if (cropMode === "blur_background") {
    // Canvas 9:16 with blurred video filling background and crisp video in center
    filterChain = `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},boxblur=20:5[bg];[0:v]scale=${targetWidth}:-1:force_original_aspect_ratio=decrease${colorGradeFilter}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]`;
    if (assSubtitlePath && fs.existsSync(assSubtitlePath)) {
      const escapedAssPath = assSubtitlePath.replace(/\\/g, "/").replace(/:/g, "\\:");
      filterChain += `;[v]ass='${escapedAssPath}'[outv]`;
    }
  } else {
    // Direct crop to 9:16 aspect ratio
    let xOffsetFormula = "(in_w-in_h*9/16)/2"; // center default
    if (cropMode === "left") {
      xOffsetFormula = "0";
    } else if (cropMode === "right") {
      xOffsetFormula = "(in_w-in_h*9/16)";
    } else if (cropMode === "custom") {
      const factor = Math.max(0, Math.min(100, customCropXPercent)) / 100;
      xOffsetFormula = `(in_w-in_h*9/16)*${factor.toFixed(3)}`;
    }

    // Crop, Lanczos upscale, unsharp mask, and optional color grade
    filterChain = `crop=in_h*9/16:in_h:${xOffsetFormula}:0,scale=${targetWidth}:${targetHeight}:${sharpnessFilter}${colorGradeFilter}`;

    if (assSubtitlePath && fs.existsSync(assSubtitlePath)) {
      const escapedAssPath = assSubtitlePath.replace(/\\/g, "/").replace(/:/g, "\\:");
      filterChain += `,ass='${escapedAssPath}'[outv]`;
    } else {
      filterChain += "[outv]";
    }
  }

  const mapOutput = cropMode === "blur_background" && !(assSubtitlePath && fs.existsSync(assSubtitlePath))
    ? "[v]"
    : "[outv]";

  const preset = quality === "fast" ? "fast" : "medium";
  const crf = quality === "fast" ? "22" : "19"; // High-bitrate crisp visual output

  const args = [
    "-y",
    "-ss",
    startTime.toFixed(3),
    "-t",
    duration.toFixed(3),
    "-i",
    sourceVideoPath,
    "-filter_complex",
    filterChain,
    "-map",
    mapOutput,
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    crf,
    "-profile:v",
    "high",
    "-level",
    "4.2",
    "-pix_fmt",
    "yuv420p",
    "-b:v",
    "8M",
    "-maxrate",
    "12M",
    "-bufsize",
    "16M",
  ];

  // If anti-claim protection is active, micro-shift audio tempo to modify perceptual acoustic fingerprint
  if (antiClaimProtection) {
    args.push("-filter:a", "atempo=1.025,equalizer=f=1000:width_type=o:width=2:g=1.5");
  }

  args.push(
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-movflags",
    "+faststart",
    outputVideoPath
  );

  await execSafeProcess(FFMPEG_PATH, args, 300000);
  return outputVideoPath;
}
