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
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.min(99, Math.round((seconds % 1) * 100));

  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

/**
 * Format seconds to SRT timestamp format: HH:MM:SS,mmm
 */
export function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.min(999, Math.round((seconds % 1) * 1000));

  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

/**
 * Generates an ASS subtitle file content from segments with relative timing.
 * startTimeShift is subtracted from each segment start/end if clipping a slice of a longer video.
 */
export function generateAssContent(
  segments: SubtitleSegment[],
  startTimeShift = 0,
  options: AssStyleOptions = {}
): string {
  const preset = options.preset || "bold_viral";
  const fontName = options.fontName || "Arial";
  const fontSize = options.fontSize || 42;
  const bottomMargin = options.bottomMargin || 180; // Above TikTok/Reels UI

  let primaryColor = "&H00FFFFFF"; // White
  let secondaryColor = "&H0000FFFF"; // Yellow
  let outlineColor = "&H00000000"; // Black
  let backColor = "&H80000000";
  let bold = 1;
  let outline = 4;
  let shadow = 2;
  let borderStyle = 1; // 1 = outline + shadow, 3 = opaque box

  switch (preset) {
    case "bold_viral":
      primaryColor = "&H0000F7FF"; // Vibrant Yellow
      secondaryColor = "&H00FFFFFF";
      outlineColor = "&H000B0B0B";
      bold = 1;
      outline = 4.5;
      shadow = 2;
      break;
    case "electric_violet":
      primaryColor = "&H00F5E67C"; // Electric Violet in ASS BGR (&H7CE6F5)
      secondaryColor = "&H00FFFFFF";
      outlineColor = "&H00000000";
      bold = 1;
      outline = 4;
      shadow = 2;
      break;
    case "minimal_clean":
      primaryColor = "&H00FFFFFF";
      outlineColor = "&H00111111";
      bold = 0;
      outline = 2;
      shadow = 1;
      break;
    case "classic_dark":
      primaryColor = "&H00FFFFFF";
      borderStyle = 3; // Box
      backColor = "&HAA000000";
      outline = 2;
      shadow = 0;
      break;
    default:
      break;
  }

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},${secondaryColor},${outlineColor},${backColor},${bold},0,0,0,100,100,0,0,${borderStyle},${outline},${shadow},2,60,60,${bottomMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events: string[] = [];

  for (const seg of segments) {
    const relStart = Math.max(0, seg.start - startTimeShift);
    const relEnd = Math.max(relStart + 0.2, seg.end - startTimeShift);

    const startAss = formatAssTime(relStart);
    const endAss = formatAssTime(relEnd);

    // If word-level timing is available, we can format dynamic karaoke or highlighted words
    let text = seg.text.trim();

    // Wrap long lines for 9:16 vertical view (limit ~24 characters per line)
    if (text.length > 28 && !text.includes("\\N")) {
      const words = text.split(" ");
      let line1 = "";
      let line2 = "";
      for (const w of words) {
        if ((line1 + " " + w).length <= 22) {
          line1 = line1 ? `${line1} ${w}` : w;
        } else {
          line2 = line2 ? `${line2} ${w}` : w;
        }
      }
      text = line2 ? `${line1}\\N${line2}` : line1;
    }

    events.push(`Dialogue: 0,${startAss},${endAss},Default,,0,0,0,,${text}`);
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
