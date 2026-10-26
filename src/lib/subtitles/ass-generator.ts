import fs from "fs";
import path from "path";

export interface SubtitleWord {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface SubtitleSegment {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  words?: SubtitleWord[];
}

export type CaptionPreset =
  | "bold_viral"       // High-impact yellow & white with strong black outline
  | "electric_violet"  // Violet accent with crisp white text
  | "minimal_clean"    // Clean white sans-serif with subtle drop shadow
  | "classic_dark"     // White text with translucent black pill background
  | "mdscae_cinema"    // Signature MDS CAE: Ivory white, subtle charcoal outline, elegant lower-center cinematic typography
  | "none";

export interface AssStyleOptions {
  preset?: CaptionPreset;
  fontName?: string;
  fontSize?: number;
  primaryColor?: string; // ASS color format &HAABBGGRR or hex
  outlineColor?: string;
  bottomMargin?: number; // MarginV in pixels
}

/**
 * Converts standard hex color (#RRGGBB) to ASS color format (&H00BBGGRR)
 */
export function hexToAssColor(hex: string, alpha = "00"): string {
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length !== 6) return "&H00FFFFFF";
  const r = cleanHex.substring(0, 2);
  const g = cleanHex.substring(2, 4);
  const b = cleanHex.substring(4, 6);
  return `&H${alpha}${b}${g}${r}`;
}

/**
 * Format seconds to ASS timestamp format: H:MM:SS.cc
 */
export function formatAssTime(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = Math.floor(safeSec % 60);
  const cs = Math.min(99, Math.round((safeSec % 1) * 100));

  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

/**
 * Format seconds to SRT timestamp format: HH:MM:SS,mmm
 */
export function formatSrtTime(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = Math.floor(safeSec % 60);
  const ms = Math.min(999, Math.round((safeSec % 1) * 1000));

  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

/**
 * Wraps text into lines with a strict character limit per line for 9:16 vertical video.
 * Max ~18-20 characters per line guarantees text never clips off screen edges.
 */
export function wrapTextFor916(text: string, maxCharsPerLine = 19): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxCharsPerLine) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  // Join lines with ASS newline character \N
  return lines.join("\\N");
}

interface MicroCue {
  start: number;
  end: number;
  text: string;
}

/**
 * Subdivides long transcript segments into short, viral, punchy 3-5 word cues
 * designed specifically for vertical 9:16 platforms (Shorts, Reels, TikTok).
 */
export function subdivideInto916Cues(
  segments: SubtitleSegment[],
  startTimeShift = 0
): MicroCue[] {
  const cues: MicroCue[] = [];

  for (const seg of segments) {
    const relStart = Math.max(0, seg.start - startTimeShift);
    const relEnd = Math.max(relStart + 0.3, seg.end - startTimeShift);
    const totalDuration = relEnd - relStart;

    const words = seg.text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    // If segment is short (<= 5 words), keep as a single cue
    if (words.length <= 5) {
      cues.push({
        start: relStart,
        end: relEnd,
        text: wrapTextFor916(words.join(" ")),
      });
      continue;
    }

    // Chunk into groups of 3-4 words for dynamic viral appearance
    const chunkSize = words.length > 8 ? 4 : 3;
    const wordGroups: string[][] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      wordGroups.push(words.slice(i, i + chunkSize));
    }

    const chunkDuration = totalDuration / wordGroups.length;

    for (let g = 0; g < wordGroups.length; g++) {
      const cStart = relStart + g * chunkDuration;
      const cEnd = g === wordGroups.length - 1 ? relEnd : relStart + (g + 1) * chunkDuration;
      const chunkText = wordGroups[g].join(" ");

      cues.push({
        start: cStart,
        end: cEnd,
        text: wrapTextFor916(chunkText),
      });
    }
  }

  return cues;
}

/**
 * Generates an ASS subtitle file content optimized for 9:16 vertical video.
 * startTimeShift is subtracted from each segment start/end if clipping a slice of a longer video.
 */
export function generateAssContent(
  segments: SubtitleSegment[],
  startTimeShift = 0,
  options: AssStyleOptions = {}
): string {
  const preset = options.preset || "bold_viral";
  const fontName = options.fontName || (preset === "mdscae_cinema" ? "Arial" : "Impact");
  const fontSize = options.fontSize || (preset === "mdscae_cinema" ? 44 : 48); // Optimal size for 1080x1920 mobile viewing
  const bottomMargin = options.bottomMargin || (preset === "mdscae_cinema" ? 430 : 360); // Safe area above Shorts/Reels UI bar

  let primaryColor = "&H00FFFFFF"; // White
  let secondaryColor = "&H0000FFFF"; // Yellow
  let outlineColor = "&H00000000"; // Black
  let backColor = "&H80000000";
  let bold = 1;
  let outline = 5;
  let shadow = 2;
  let borderStyle = 1; // 1 = outline + shadow, 3 = opaque box

  switch (preset) {
    case "mdscae_cinema":
      primaryColor = "&H00FAF8F5"; // Ivory warm white (ASS BGR format)
      secondaryColor = "&H00E2E2E2";
      outlineColor = "&H00080808"; // Deep subtle charcoal outline
      backColor = "&HA0000000";   // Translucent back shadow
      bold = 1;
      outline = 3.2;
      shadow = 1.8;
      break;
    case "bold_viral":
      primaryColor = "&H0000F7FF"; // High-visibility bright yellow (ASS BGR)
      secondaryColor = "&H00FFFFFF";
      outlineColor = "&H000B0B0B";
      bold = 1;
      outline = 5;
      shadow = 2;
      break;
    case "electric_violet":
      primaryColor = "&H00F5E67C"; // Electric Violet
      secondaryColor = "&H00FFFFFF";
      outlineColor = "&H00000000";
      bold = 1;
      outline = 4.5;
      shadow = 2;
      break;
    case "minimal_clean":
      primaryColor = "&H00FFFFFF";
      outlineColor = "&H00111111";
      bold = 1;
      outline = 3;
      shadow = 1;
      break;
    case "classic_dark":
      primaryColor = "&H00FFFFFF";
      borderStyle = 3; // Box pill
      backColor = "&HAA000000";
      outline = 2;
      shadow = 0;
      break;
    default:
      break;
  }

  // ASS Header targeting vertical 1080x1920 with safe area margins
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},${secondaryColor},${outlineColor},${backColor},${bold},0,0,0,100,100,0,0,${borderStyle},${outline},${shadow},2,90,90,${bottomMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Generate dynamic 9:16 safe micro-cues
  const cues = subdivideInto916Cues(segments, startTimeShift);
  const events: string[] = [];

  for (const cue of cues) {
    const startAss = formatAssTime(cue.start);
    const endAss = formatAssTime(cue.end);

    events.push(`Dialogue: 0,${startAss},${endAss},Default,,0,0,0,,${cue.text}`);
  }

  return header + events.join("\n") + "\n";
}

/**
 * Generates standard SRT subtitle text from segments
 */
export function generateSrtContent(segments: SubtitleSegment[], startTimeShift = 0): string {
  let srt = "";
  let idx = 1;

  for (const seg of segments) {
    const relStart = Math.max(0, seg.start - startTimeShift);
    const relEnd = Math.max(relStart + 0.2, seg.end - startTimeShift);

    srt += `${idx}\n`;
    srt += `${formatSrtTime(relStart)} --> ${formatSrtTime(relEnd)}\n`;
    srt += `${seg.text.trim()}\n\n`;
    idx++;
  }

  return srt;
}

/**
 * Saves ASS file to disk for FFmpeg burning
 */
export function writeAssFile(
  filePath: string,
  segments: SubtitleSegment[],
  startTimeShift = 0,
  options: AssStyleOptions = {}
): string {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = generateAssContent(segments, startTimeShift, options);
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}
