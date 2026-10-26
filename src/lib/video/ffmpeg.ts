import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import {
  detectWatermarks,
  getDefaultWatermarkBox,
  buildDelogoFilterString,
  WatermarkZone,
} from "./watermark-detector";

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

export type VideoFilterPreset =
  | "none"
  | "teal_orange"       // Cinematic Hollywood Lumetri look
  | "warm_sunset"       // Golden Hour / warm California glow
  | "cyberpunk_neon"    // Electric blues, neon magenta punch
  | "vintage_35mm"      // Kodak Portra 35mm film curve + micro grain
  | "viral_oled"        // Vibrant pop, high-contrast, razor-sharp (TikTok/Reels)
  | "noir_dramatic"     // Classic Hollywood black and white
  | "mdscae_moody"      // Signature MDS CAE Atmospheric Cinema (Deep blacks, muted tones, sharp edge outlines)
  | "mrbeast_hyperpop"  // Signature MrBeast Clips look: Ultra-vivid hyper-saturation (1.52x), dynamic contrast punch (1.28x), razor-sharp edge clarity
  | "anti_claim_shield"; // Multi-layer anti-fingerprint protection

/**
 * Returns FFmpeg video filtergraph fragment for Adobe Premiere Pro style visual filters
 */
export function getVideoFilterGraph(filter?: VideoFilterPreset | string, antiClaim = false): string {
  switch (filter) {
    case "mrbeast_hyperpop":
      return ",colorbalance=rs=0.05:gs=0.03:bs=-0.04:rm=0.04:gm=0.02:bm=-0.02:rh=0.06:gh=0.04:bh=-0.05,eq=contrast=1.28:brightness=0.03:saturation=1.52,unsharp=5:5:1.1:5:5:0.0";
    case "mdscae_moody":
      return ",colorbalance=rs=-0.06:gs=0.01:bs=0.08:rm=0.0:gm=-0.02:bm=0.04:rh=0.08:gh=0.04:bh=-0.04,eq=contrast=1.24:brightness=-0.03:saturation=0.92,unsharp=5:5:0.7:5:5:0.0";
    case "teal_orange":
      return ",colorbalance=rs=-0.08:gs=0.01:bs=0.12:rm=0.02:gm=0.0:bm=-0.04:rh=0.14:gh=0.05:bh=-0.1,eq=contrast=1.15:saturation=1.28";
    case "warm_sunset":
      return ",colorbalance=rs=0.12:gs=0.04:bs=-0.1:rm=0.14:gm=0.05:bm=-0.1:rh=0.12:gh=0.06:bh=-0.08,eq=contrast=1.08:brightness=0.02:saturation=1.25";
    case "cyberpunk_neon":
      return ",colorbalance=rs=-0.1:gs=-0.03:bs=0.16:rm=0.08:gm=-0.04:bm=0.12:rh=0.14:gh=0.0:bh=0.12,eq=contrast=1.2:saturation=1.35";
    case "vintage_35mm":
      return ",colorbalance=rs=0.05:gs=0.02:bs=-0.04:rh=0.06:gh=0.03:bh=-0.04,eq=contrast=1.06:brightness=0.01:saturation=1.05,noise=c0s=4:c0f=t+u";
    case "viral_oled":
      return ",eq=contrast=1.22:brightness=0.02:saturation=1.4,unsharp=5:5:0.8:5:5:0.0";
    case "noir_dramatic":
      return ",hue=s=0,eq=contrast=1.35:brightness=-0.02";
    case "anti_claim_shield":
      return ",colorbalance=rs=-0.04:gs=0.02:bs=0.05:rh=0.08:gh=0.03:bh=-0.05,noise=c0s=3:c0f=t+u,vignette=PI/4,eq=contrast=1.1:brightness=0.01:saturation=1.12";
    default:
      return antiClaim ? ",eq=contrast=1.04:brightness=0.01:saturation=1.06" : "";
  }
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
  quality?: "fast" | "high" | "ultra_2k" | "cinema_4k";
  resolution?: "1080p" | "2k" | "4k";
  videoFilter?: VideoFilterPreset | string; // Adobe Pro style visual grading filter
  antiClaimProtection?: boolean; // Transforms video & audio fingerprints to prevent Content ID claims
  removeWatermark?: boolean; // When true, automatically removes creator watermarks/channel logos using delogo
  watermarkZone?: WatermarkZone | "auto" | "all" | "none"; // Target specific corner or auto-detect
  musicTrack?: string; // Background music track key (e.g. stoic_piano, phonk_drift) or file path
  musicVolume?: number; // 0.05 to 0.50, default 0.18 (smart ducking under speech)
}

/**
 * Renders a vertical 9:16 clip from source video with reframing and optional burned-in ASS subtitles.
 */
export async function renderVerticalClip(options: RenderClipOptions): Promise<string> {
  let {
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
    resolution,
    videoFilter = "none",
    antiClaimProtection = false,
    removeWatermark = false,
    watermarkZone = "auto",
    musicTrack = "none",
    musicVolume = 0.18,
  } = options;

  // Ultra-HD Resolution Resolution Logic (2K forces YouTube VP9 / AV01 codec)
  if (resolution === "2k" || quality === "ultra_2k") {
    targetWidth = 1440;
    targetHeight = 2560;
  } else if (resolution === "4k" || quality === "cinema_4k") {
    targetWidth = 2160;
    targetHeight = 3840;
  } else if (resolution === "1080p") {
    targetWidth = 1080;
    targetHeight = 1920;
  }

  const outputDir = path.dirname(outputVideoPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const duration = Math.max(0.5, endTime - startTime);

  // High-fidelity upscaling & edge enhancement filters
  const sharpnessFilter = "flags=lanczos+accurate_rnd,unsharp=5:5:0.75:5:5:0.0";
  const isAntiClaimActive = antiClaimProtection || videoFilter === "anti_claim_shield";
  const colorGradeFilter = getVideoFilterGraph(videoFilter, isAntiClaimActive);

  // Build delogo filter string if watermark removal is active
  let delogoFilter = "";
  if (removeWatermark && watermarkZone !== "none") {
    try {
      const probe = await probeMedia(sourceVideoPath);
      const videoW = probe.width || 1280;
      const videoH = probe.height || 720;

      let boxes: { x: number; y: number; width: number; height: number }[] = [];

      if (watermarkZone === "auto") {
        const scanResult = await detectWatermarks(sourceVideoPath, startTime, duration);
        if (scanResult.detected && scanResult.watermarks.length > 0) {
          boxes = scanResult.watermarks;
        } else {
          // Default to cleaning standard YouTube bottom-right creator watermark corner
          boxes = [getDefaultWatermarkBox("bottom_right", videoW, videoH)];
        }
      } else if (watermarkZone === "all") {
        boxes = [
          getDefaultWatermarkBox("bottom_right", videoW, videoH),
          getDefaultWatermarkBox("top_right", videoW, videoH),
          getDefaultWatermarkBox("top_left", videoW, videoH),
          getDefaultWatermarkBox("bottom_left", videoW, videoH),
        ];
      } else {
        boxes = [getDefaultWatermarkBox(watermarkZone as WatermarkZone, videoW, videoH)];
      }

      delogoFilter = buildDelogoFilterString(boxes);
    } catch (wErr) {
      console.warn("Watermark detection / delogo setup failed, skipping delogo:", wErr);
    }
  }

  // Build filter chain
  let filterChain = "";

  if (cropMode === "blur_background") {
    // Canvas 9:16 with darkened, blurred background filling vertical space and crisp graded video in center (MDS CAE style)
    if (delogoFilter) {
      filterChain = `[0:v]${delogoFilter},split=2[bgsrc][fgsrc];[bgsrc]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},boxblur=25:5,eq=brightness=-0.16:contrast=0.92[bg];[fgsrc]scale=${targetWidth}:-1:force_original_aspect_ratio=decrease${colorGradeFilter}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]`;
    } else {
      filterChain = `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},boxblur=25:5,eq=brightness=-0.16:contrast=0.92[bg];[0:v]scale=${targetWidth}:-1:force_original_aspect_ratio=decrease${colorGradeFilter}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]`;
    }

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

    // Crop, Lanczos upscale, unsharp mask, optional delogo, and optional color grade
    const preCropFilter = delogoFilter ? `${delogoFilter},` : "";
    filterChain = `${preCropFilter}crop=in_h*9/16:in_h:${xOffsetFormula}:0,scale=${targetWidth}:${targetHeight}:${sharpnessFilter}${colorGradeFilter}`;

    if (assSubtitlePath && fs.existsSync(assSubtitlePath)) {
      const escapedAssPath = assSubtitlePath.replace(/\\/g, "/").replace(/:/g, "\\:");
      filterChain += `,ass='${escapedAssPath}'[outv]`;
    } else {
      filterChain += "[outv]";
    }
  }

  // Background music resolution
  let musicFilePath: string | null = null;
  const duckedVol = (typeof musicVolume === "number" ? Math.max(0.02, Math.min(0.8, musicVolume)) : 0.18).toFixed(2);

  if (musicTrack && musicTrack !== "none") {
    const candidatePath = path.resolve("./storage/music", `${musicTrack}.mp3`);
    if (fs.existsSync(candidatePath)) {
      musicFilePath = candidatePath;
    } else if (fs.existsSync(musicTrack)) {
      musicFilePath = musicTrack;
    }
  }

  // Audio filter mixing graph
  let hasAudioMixing = false;
  if (musicFilePath) {
    hasAudioMixing = true;
    filterChain += `;[0:a]volume=1.05,aformat=channel_layouts=stereo:sample_rates=48000[voice];[1:a]volume=${duckedVol},atrim=0:${duration.toFixed(3)},afade=t=out:st=${Math.max(0, duration - 1.5).toFixed(3)}:d=1.5,aformat=channel_layouts=stereo:sample_rates=48000[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2${isAntiClaimActive ? ',atempo=1.025,equalizer=f=1000:width_type=o:width=2:g=1.2' : ''}[outa]`;
  }

  const mapOutput = cropMode === "blur_background" && !(assSubtitlePath && fs.existsSync(assSubtitlePath))
    ? "[v]"
    : "[outv]";

  const preset = quality === "fast" ? "fast" : "medium";
  
  // YouTube Mastering Bitrates & CRF
  let crf = "17";
  let videoBitrate = "16M";
  let maxRate = "24M";
  let bufSize = "32M";

  if (targetWidth >= 2160) {
    // 4K Cinema
    crf = "15";
    videoBitrate = "35M";
    maxRate = "50M";
    bufSize = "70M";
  } else if (targetWidth >= 1440) {
    // 2K QHD (Forces YouTube VP9 / AV01 codec!)
    crf = "16";
    videoBitrate = "24M";
    maxRate = "32M";
    bufSize = "45M";
  }

  const args = [
    "-y",
    "-ss",
    startTime.toFixed(3),
    "-t",
    duration.toFixed(3),
    "-i",
    sourceVideoPath,
  ];

  if (musicFilePath) {
    args.push(
      "-stream_loop",
      "-1",
      "-t",
      duration.toFixed(3),
      "-i",
      musicFilePath
    );
  }

  args.push(
    "-filter_complex",
    filterChain,
    "-map",
    mapOutput,
    "-map",
    hasAudioMixing ? "[outa]" : "0:a?",
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    crf,
    "-profile:v",
    "high",
    "-level",
    "5.1",
    "-pix_fmt",
    "yuv420p",
    "-colorspace",
    "bt709",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    "-color_range",
    "tv",
    "-b:v",
    videoBitrate,
    "-maxrate",
    maxRate,
    "-bufsize",
    bufSize
  );

  // If anti-claim protection is active without music mixing, apply tempo/eq on single audio stream
  if (isAntiClaimActive && !hasAudioMixing) {
    args.push("-filter:a", "atempo=1.025,equalizer=f=1000:width_type=o:width=2:g=1.5");
  }

  args.push(
    "-c:a",
    "aac",
    "-b:a",
    "256k",
    "-ar",
    "48000",
    "-movflags",
    "+faststart",
    outputVideoPath
  );

  await execSafeProcess(FFMPEG_PATH, args, 300000);
  return outputVideoPath;
}
